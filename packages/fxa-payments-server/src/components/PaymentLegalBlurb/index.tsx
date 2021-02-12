import React from 'react';
import { Localized } from '@fluent/react';

import './index.scss';

export const PaymentLegalBlurb = () => (
  <div className="payment-legal-blurb">
    <Localized id="payment-legal-copy-stripe-paypal">
      <p>Mozilla uses Stripe and Paypal for secure payment processing.</p>
    </Localized>

    <Localized
      id="payment-legal-link-stripe-paypal"
      elems={{
        stripe: (
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          ></a>
        ),
        paypal: (
          <a
            href="https://paypal.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          ></a>
        ),
      }}
    >
      <p>
        View the <stripe>Stripe privacy policy</stripe> and{' '}
        <paypal>Paypal privacy policy</paypal>.
      </p>
    </Localized>
  </div>
);

export default PaymentLegalBlurb;
