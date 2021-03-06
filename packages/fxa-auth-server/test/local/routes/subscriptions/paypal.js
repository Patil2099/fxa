/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const sinon = require('sinon');
const { Container } = require('typedi');
const assert = { ...sinon.assert, ...require('chai').assert };
const { getRoute } = require('../../../routes_helpers');
const mocks = require('../../../mocks');
const { PayPalHelper } = require('../../../../lib/payments/paypal');
const uuid = require('uuid');
const { StripeHelper } = require('../../../../lib/payments/stripe');

const customerFixture = require('../../payments/fixtures/stripe/customer1.json');
const subscription2 = require('../../payments/fixtures/stripe/subscription2.json');
const openInvoice = require('../../payments/fixtures/stripe/invoice_open.json');
const { filterSubscription } = require('fxa-shared/subscriptions/stripe');

const ACCOUNT_LOCALE = 'en-US';
const SUBSCRIPTIONS_MANAGEMENT_SCOPE =
  'https://identity.mozilla.com/account/subscriptions';
const TEST_EMAIL = 'test@email.com';
const UID = uuid.v4({}, Buffer.alloc(16)).toString('hex');
const MOCK_SCOPES = ['profile:email', SUBSCRIPTIONS_MANAGEMENT_SCOPE];

let log,
  customs,
  request,
  payPalHelper,
  token,
  stripeHelper,
  requestOptions,
  profile,
  push;

function runTest(routePath) {
  const config = {
    subscriptions: {
      enabled: true,
      paypalNvpSigCredentials: {
        enabled: true,
      },
    },
  };
  const db = mocks.mockDB({
    uid: UID,
    email: TEST_EMAIL,
    locale: ACCOUNT_LOCALE,
  });
  const routes = require('../../../../lib/routes/subscriptions')(
    log,
    db,
    config,
    customs,
    push, // push
    {}, // mailer
    profile, // profile
    stripeHelper // stripeHelper
  );
  const route = getRoute(routes, routePath, requestOptions.method || 'GET');
  request = mocks.mockRequest(requestOptions);
  return route.handler(request);
}

/**
 * To prevent the modification of the test objects loaded, which can impact other tests referencing the object,
 * a deep copy of the object can be created which uses the test object as a template
 *
 * @param {Object} object
 */
function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

/**
 * Paypal integration tests
 */
describe('subscriptions payPalRoutes', () => {
  requestOptions = {
    method: 'POST',
    auth: {
      credentials: {
        scope: MOCK_SCOPES,
        user: `${UID}`,
        email: `${TEST_EMAIL}`,
      },
    },
  };

  beforeEach(() => {
    sinon.createSandbox();
    log = mocks.mockLog();
    customs = mocks.mockCustoms();
    token = uuid.v4();
    stripeHelper = {};
    Container.set(StripeHelper, stripeHelper);
    payPalHelper = Container.get(PayPalHelper);
    profile = {};
    push = {};
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /oauth/subscriptions/paypal-checkout', () => {
    beforeEach(() => {
      payPalHelper.getCheckoutToken = sinon.fake.resolves(token);
    });

    it('should call PayPalHelper.getCheckoutToken and return token in an object', async () => {
      const response = await runTest('/oauth/subscriptions/paypal-checkout');
      sinon.assert.calledOnce(payPalHelper.getCheckoutToken);
      assert.deepEqual(response, { token });
    });

    it('should log the call', async () => {
      await runTest('/oauth/subscriptions/paypal-checkout');
      sinon.assert.calledOnceWithExactly(
        log.begin,
        'subscriptions.getCheckoutToken',
        request
      );
      sinon.assert.calledOnceWithExactly(
        log.info,
        'subscriptions.getCheckoutToken.success',
        { token: token }
      );
    });

    it('should do a customs check', async () => {
      await runTest('/oauth/subscriptions/paypal-checkout');
      sinon.assert.calledOnceWithExactly(
        customs.check,
        request,
        TEST_EMAIL,
        'getCheckoutToken'
      );
    });
  });

  describe('POST /oauth/subscriptions/active/new-paypal', () => {
    beforeEach(() => {
      stripeHelper.refreshCachedCustomer = sinon.fake.resolves({});
      profile.deleteCache = sinon.fake.resolves({});
      push.notifyProfileUpdated = sinon.fake.resolves({});
    });

    it('should run a charge successfully', async () => {
      const customer = deepCopy(customerFixture);
      const subscription = deepCopy(subscription2);
      subscription.latest_invoice = openInvoice;
      stripeHelper.customer = sinon.fake.resolves(customer);
      payPalHelper.createBillingAgreement = sinon.fake.resolves('B-test');
      payPalHelper.agreementDetails = sinon.fake.resolves({});
      stripeHelper.createSubscriptionWithPaypal = sinon.fake.resolves(
        subscription
      );
      stripeHelper.updateCustomerPaypalAgreement = sinon.fake.resolves(
        customer
      );
      payPalHelper.processInvoice = sinon.fake.resolves({});
      const actual = await runTest('/oauth/subscriptions/active/new-paypal');
      assert.deepEqual(actual, {
        sourceCountry: undefined,
        subscription: filterSubscription(subscription),
      });
      sinon.assert.calledOnce(stripeHelper.customer);
      sinon.assert.calledOnce(payPalHelper.createBillingAgreement);
      sinon.assert.calledOnce(payPalHelper.agreementDetails);
      sinon.assert.calledOnce(stripeHelper.createSubscriptionWithPaypal);
      sinon.assert.calledOnce(stripeHelper.updateCustomerPaypalAgreement);
      sinon.assert.calledOnce(payPalHelper.processInvoice);
    });

    it('should skip a zero charge successfully', async () => {
      const customer = deepCopy(customerFixture);
      const subscription = deepCopy(subscription2);
      subscription.latest_invoice = deepCopy(openInvoice);
      subscription.latest_invoice.amount_due = 0;
      stripeHelper.customer = sinon.fake.resolves(customer);
      payPalHelper.createBillingAgreement = sinon.fake.resolves('B-test');
      payPalHelper.agreementDetails = sinon.fake.resolves({});
      stripeHelper.createSubscriptionWithPaypal = sinon.fake.resolves(
        subscription
      );
      stripeHelper.updateCustomerPaypalAgreement = sinon.fake.resolves(
        customer
      );
      payPalHelper.processZeroInvoice = sinon.fake.resolves({});
      const actual = await runTest('/oauth/subscriptions/active/new-paypal');
      assert.deepEqual(actual, {
        sourceCountry: undefined,
        subscription: filterSubscription(subscription),
      });
      sinon.assert.calledOnce(stripeHelper.customer);
      sinon.assert.calledOnce(payPalHelper.createBillingAgreement);
      sinon.assert.calledOnce(payPalHelper.agreementDetails);
      sinon.assert.calledOnce(stripeHelper.createSubscriptionWithPaypal);
      sinon.assert.calledOnce(stripeHelper.updateCustomerPaypalAgreement);
      sinon.assert.calledOnce(payPalHelper.processZeroInvoice);
    });
  });
});
