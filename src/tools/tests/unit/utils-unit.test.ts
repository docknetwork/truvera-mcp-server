import { describe, it, expect, beforeAll } from 'vitest';
import { liftProperties } from '../../utils';

describe('unit: utils tests', () => {
  it('liftProperties should pull contents of payload field up', { timeout: 30000 }, async () => {
    const input = {body: {
        payload: {
          format: 'jsonld',
          algorithm: 'dockbbs',
          credential: {
          type: ["VerifiableCredential", "BasicCredential"],
            issuer: 'did:cheqd:testnet:4959f287-0f05-4181-b113-8ae59f223e0e',
            subject: {
              id: "did:key:z6MkwXuENoK6fxrdBEKa5ipTi8gmSec4AQJsEEiTrR87D4bH",
              name: "Jane Doe"
            }
          },
          distribute: true
        }
      }
    }

    const expectedOutput = {
      format: "jsonld",
      algorithm: "dockbbs",
      credential: {
        type: ["VerifiableCredential", "BasicCredential"],
        issuer: "did:cheqd:testnet:4959f287-0f05-4181-b113-8ae59f223e0e",
        subject: {
          id: "did:key:z6MkwXuENoK6fxrdBEKa5ipTi8gmSec4AQJsEEiTrR87D4bH",
          name: "Jane Doe"
        }
      },
      distribute: true
    };

    const result = liftProperties(input);
    expect(result).toEqual(expectedOutput);
  });
});