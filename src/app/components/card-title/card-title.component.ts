import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgxComponentDirective } from '@decaf-ts/for-angular';
import { UIFunctionLike } from '@decaf-ts/ui-decorators';
import { TranslatePipe } from '@ngx-translate/core';
import { AppAllowedForDirective } from 'src/app/directives/allowed-for.directive';
import { EPIDefaultWriterControlRole } from 'src/app/utils';
import { IAccessControlRole, ITabItem } from 'src/app/utils/interfaces';
import { AppSwitcherComponent } from '../switcher/switcher.component';

interface ICreateButton {
  text: string;
  color?: string;
  enabled?: boolean;
  accessControlRole?: IAccessControlRole | undefined;
  handle: UIFunctionLike;
}

@Component({
  selector: 'app-card-title',
  templateUrl: './card-title.component.html',
  styleUrls: ['./card-title.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppAllowedForDirective, AppSwitcherComponent],
})
export class AppCardTitleComponent extends NgxComponentDirective implements OnInit {
  @Input({ required: true })
  title?: string = '';

  @Input()
  subtitle?: string = '';

  @Input()
  allowCreate: boolean = true;

  @Input()
  tabs: ITabItem[] = [];

  @Input()
  override borders: boolean = true;

  @Input()
  override operation: OperationKeys | undefined = undefined;

  @Input()
  accessControlRole: IAccessControlRole | undefined = EPIDefaultWriterControlRole;

  @Input()
  isPla: boolean = false;

  @Input()
  disabled?: boolean;

  @Input()
  createButton: ICreateButton = {
    text: 'create',
    handle: async () => await this.handleRedirect(),
  };

  button!: ICreateButton;

  constructor() {
    super('AppCardTitleComponent');
  }

  async ngOnInit(): Promise<void> {
    this.button = {
      ...{ color: 'primary', enabled: true },
      ...this.createButton,
    };

    if ('accessControlRole' in this.button) {
      this.accessControlRole = this.button.accessControlRole;
    }
    this.initialized = true;
  }

  async handleRedirect(): Promise<void> {
    await this.router.navigateByUrl(`${this.route}/create`, { onSameUrlNavigation: 'reload' });
  }
}
