import { ISODateString } from './common';

export interface Proof {
  type: string;
  proofPurpose: string;
  verificationMethod: string;
  created?: ISODateString;
  challenge?: string;
  domain?: string;
  proofValue?: string;
  jws?: string;
}
