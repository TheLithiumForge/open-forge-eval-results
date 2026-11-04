import { DEAL_NAME_MAX_UNITS } from '../deal-name.ts';
import { ReproductionControl } from './control-labels.ts';
import './control.css';
import './deal-name.css';

interface DealNameFieldProps {
  name: string;
  rename(name: string): void;
}

// The field shows the current game's name, so a new deal or an import replaces it.
export function DealNameField({ name, rename }: DealNameFieldProps) {
  return (
    <div className="deal-name">
      <label htmlFor="deal-name">{ReproductionControl.dealName}</label>
      <input
        id="deal-name"
        className="control"
        value={name}
        maxLength={DEAL_NAME_MAX_UNITS}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => rename(event.currentTarget.value)}
      />
    </div>
  );
}
