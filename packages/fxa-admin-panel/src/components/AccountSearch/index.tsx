/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import Account from './Account';
import './index.scss';

interface AccountType {
  uid: any;
  createdAt: number;
  emails: [
    {
      email: string;
      isVerified: boolean;
      isPrimary: boolean;
      createdAt: number;
    }
  ];
  emailBounces: [
    {
      email: string;
      createdAt: number;
      bounceType: string;
      bounceSubType: string;
    }
  ];
}

export const GET_ACCOUNT_BY_EMAIL = gql`
  query getAccountByEmail($email: String!) {
    accountByEmail(email: $email) {
      uid
      createdAt
      emails {
        email
        isVerified
        isPrimary
        createdAt
      }
      emailBounces {
        email
        createdAt
        bounceType
        bounceSubType
      }
    }
  }
`;

// new query for getting account by UID
export const GET_ACCOUNT_BY_UID = gql`
  query getAccountByUid($uid: String!) {
    accountByUid(uid: $uid) {
      uid
      createdAt
      emails {
        email
        isVerified
        isPrimary
        createdAt
      }
      emailBounces {
        email
        createdAt
        bounceType
        bounceSubType
      }
    }
  }
`;

function validateUID(uid: string) {
  // checks if input string is in uid format
  if (/^[0-9a-fA-F]{32}/.test(uid)) {
    // alphanumeric, 32 digit
    return true;
  }
  return false;
}

export const AccountSearch = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [showResult, setShowResult] = useState<Boolean>(false);
  // define two queries to search by either email or uid.
  const [getAccountbyEmail, emailResults] = useLazyQuery(GET_ACCOUNT_BY_EMAIL);
  const [getAccountbyUID, UIDResults] = useLazyQuery(GET_ACCOUNT_BY_UID);
  // choose which query result to show based on type of query made
  const [isEmail, setIsEmail] = useState<Boolean>(false);
  const queryResults = isEmail && showResult ? emailResults : UIDResults;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const isUID = validateUID(inputValue);
    // choose correct query if email or uid
    if (isUID && inputValue.search('@') == -1 && inputValue != '') {
      // uid and non-empty
      getAccountbyUID({ variables: { uid: inputValue } });
      setIsEmail(false);
      setShowResult(true);
    } else if (!isUID && inputValue.search('@') != -1 && inputValue != '') {
      // assume email if not uid and non-empty; must at least have '@'
      getAccountbyEmail({ variables: { email: inputValue } });
      setIsEmail(true);
      setShowResult(true);
    }
    // invalid input, neither email nor uid
    else {
      window.alert('Invalid email or UID format');
      setShowResult(true);
    }
  };

  return (
    <div className="account-search" data-testid="account-search">
      <h2>Account Search</h2>
      <p>
        Email addresses are blocked from the FxA email sender when an email sent
        to the address has bounced.
      </p>
      <p>
        Remove an email address from the blocked list by first searching for an
        account by email. Brief account information will be displayed as well as
        email bounces attached to the account. Delete the block on the email by
        deleting the bounced email data.
      </p>

      <form onSubmit={handleSubmit} data-testid="search-form" className="flex">
        <label htmlFor="email">Email or UID to search for:</label>
        <br />
        <input
          autoFocus
          name="email"
          type="search"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setInputValue(event.target.value)
          }
          placeholder="hello@world.com or uid"
          data-testid="email-input"
        />
        <button
          className="account-search-search-button"
          title="search"
          data-testid="search-button"
        ></button>
      </form>

      {showResult && queryResults.refetch ? (
        <>
          <hr />
          <AccountSearchResult
            onCleared={queryResults.refetch}
            {...{
              loading: queryResults.loading,
              error: queryResults.error,
              data: queryResults.data,
              query: inputValue,
            }}
          />
        </>
      ) : null}
    </div>
  );
};

const AccountSearchResult = ({
  onCleared,
  loading,
  error,
  data,
  query,
}: {
  onCleared: Function;
  loading: boolean;
  error?: {};
  data?: {
    accountByEmail: AccountType;
    accountByUid: AccountType;
  };
  query: string;
}) => {
  if (loading) return <p data-testid="loading-message">Loading...</p>;
  if (error) return <p data-testid="error-message">An error occured.</p>;

  if (data?.accountByEmail) {
    return <Account {...{ query, onCleared }} {...data.accountByEmail} />;
  }

  if (data?.accountByUid) {
    return <Account {...{ query, onCleared }} {...data.accountByUid} />;
  }
  return <p data-testid="no-account-message">Account not found.</p>;
};

export default AccountSearch;
