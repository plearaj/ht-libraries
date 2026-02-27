import {signal} from "@angular/core";

export interface IPaginatorSettings {
  pageSize?: number;
  pageSizeOptions?: number[];
  hidePageSize?: boolean;
  length?: number;
  showFirstLastButtons?: boolean;
  allowMaxLength?: boolean;
}

export class PaginatorSettings {
  readonly pageSize = signal<number>(10);
  readonly pageSizeOptions = signal<number[]>([5, 10, 25]);
  readonly hidePageSize= signal<boolean>(false);
  readonly showFirstLastButtons = signal<boolean>(false);
  readonly allowMaxLength: boolean = false;

  constructor(paginator: IPaginatorSettings) {
    if (paginator.pageSize) this.pageSize.set(paginator.pageSize);
    if (paginator.pageSizeOptions) this.pageSizeOptions.set(paginator.pageSizeOptions);
    if (paginator.hidePageSize) this.hidePageSize.set(paginator.hidePageSize);
    if (paginator.showFirstLastButtons) this.showFirstLastButtons.set(paginator.showFirstLastButtons);
    if (paginator.allowMaxLength) this.allowMaxLength = paginator.allowMaxLength;
  }
}

export class DynamicMatTablePaginator {
  readonly paginatorSettings?: PaginatorSettings;
  constructor(showPagination: false)
  constructor(showPagination: true, paginatorSettings: IPaginatorSettings)
  constructor(readonly showPagination: boolean, paginatorSettings?: IPaginatorSettings) {
    this.showPagination = showPagination;
    if (this.showPagination && paginatorSettings) {
      this.paginatorSettings = new PaginatorSettings(paginatorSettings);
    }
  }
}
