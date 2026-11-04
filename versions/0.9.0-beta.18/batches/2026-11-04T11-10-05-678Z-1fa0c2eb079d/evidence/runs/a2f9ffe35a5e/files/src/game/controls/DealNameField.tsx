import { DEAL_NAME_MAX_LENGTH, isValidDealName } from '../deal-name.ts';
import { ReproductionControl } from './control-labels.ts';

interface DealNameFieldProps {
  name: string;
  rename(name: string): void;
}

export function DealNameField({ name, rename }: DealNameFieldProps) {
  return (
    <>
      <label htmlFor="deal-name">{ReproductionControl.dealName}</label>
      <input
        id="deal-name"
        type="text"
        className="control"
        value={name}
        maxLength={DEAL_NAME_MAX_LENGTH}
        onChange={(event) => rename(event.currentTarget.value)}
        onPaste={(event) => {
          // A text input would silently strip pasted line breaks before onChange sees them.
          if (!isValidDealName(event.clipboardData.getData('text'))) event.preventDefault();
        }}
      />
    </>
  );
}
