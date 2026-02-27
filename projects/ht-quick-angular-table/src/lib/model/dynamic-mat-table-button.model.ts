export enum ButtonColor {
  Default = 'default',
  Primary = 'primary',
  Accent = 'accent',
  Warn = 'warn',
  Emphasis = 'emphasis',
  Error = 'error',
  Success = 'success',
  Info = 'info'
}
export interface Icon {
  name: string;
  color: ButtonColor;
  size?: string;
}

export type ButtonIcon = {
  icon: Icon;
  position: 'before' | 'after';
}
export class DynamicMatTableButton {
  readonly buttonType: 'button' | 'labeled';
  constructor(
    readonly buttonText: string,
    readonly buttonColor: ButtonColor = ButtonColor.Default,
    readonly buttonIcon?: ButtonIcon
  ) {
    this.buttonType = buttonIcon ? 'labeled' : 'button';
  }
}

