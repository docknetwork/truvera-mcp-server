import { JsonLdContext } from './jsonld';
import { Proof } from './proof';
import { ISODateString } from './common';

export interface CredentialSubject {
  id?: string;
  [key: string]: unknown;
}

export interface CredentialStatus {
  id?: string;
  type?: string;
  statusPurpose?: string;
  statusListIndex?: string;
  statusListCredential?: string;
  [key: string]: unknown;
}

export interface VerifiableCredential {
  '@context'?: JsonLdContext;
  id?: string;
  type: string[];
  issuer: string | CredentialIssuer;
  issuanceDate?: ISODateString;
  expirationDate?: ISODateString;
  credentialSubject: CredentialSubject | CredentialSubject[];
  credentialStatus?: CredentialStatus | string;
  proof?: Proof | Proof[];
}

export class CredentialIssuer {

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
    ];

    static getAttributeTypeMap() {
        return CredentialIssuer.attributeTypeMap;
    }

        /**
    * The unique identifier for the credential, typically a URL pointing to its location or a hash value.
    */
    'id'?: string;
    /**
    * The profile name of the issuer that signed the credential.
    */
    'issuerName'?: string | null;

}

