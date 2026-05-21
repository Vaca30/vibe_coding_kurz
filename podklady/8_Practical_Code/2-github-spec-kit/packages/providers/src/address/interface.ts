import type { AddressInput, AddressValidation } from '@imagineer/shared';

export interface AddressValidator {
  validate(input: AddressInput): Promise<AddressValidation>;
}
