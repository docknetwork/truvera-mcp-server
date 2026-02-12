import { JsonLdContext } from './jsonld';
import { VerifiableCredential } from './credentials';
import { Proof } from './proof';

export interface VerifiablePresentation {
  '@context': JsonLdContext;
  id?: string;
  type: string[];
  holder?: string;
  verifiableCredential: VerifiableCredential | VerifiableCredential[];
  proof?: Proof | Proof[];
}
