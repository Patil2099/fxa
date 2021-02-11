import React from 'react';
import { PaypalButton, PaypalButtonProps } from './index';

import { storiesOf } from '@storybook/react';
import { linkTo } from '@storybook/addon-links';
import { CUSTOMER, PLAN } from '../../../lib/mock-data';
import { PickPartial } from '../../../lib/types';

const defaultApiClientOverrides = {
  apiCreateCustomer: async () => CUSTOMER,
};

const Subject = ({
  apiClientOverrides = defaultApiClientOverrides,
  customer = CUSTOMER,
  idempotencyKey = '',
  priceId = PLAN.plan_id,
  refreshSubscriptions = linkTo('routes/Product', 'success'),
  setPaymentError = () => {},
  ...props
}: PickPartial<
  PaypalButtonProps,
  | 'customer'
  | 'idempotencyKey'
  | 'priceId'
  | 'refreshSubscriptions'
  | 'setPaymentError'
>) => {
  return (
    <PaypalButton
      {...{
        apiClientOverrides,
        customer,
        idempotencyKey,
        priceId,
        refreshSubscriptions,
        setPaymentError,
        ...props,
      }}
    />
  );
};

storiesOf('routes/Product/PaypalButton', module).add('default', () => (
  <Subject />
));
