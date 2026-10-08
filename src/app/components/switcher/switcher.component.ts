import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import {
  ComponentRendererComponent,
  Dynamic,
  ElementPosition,
  IBaseCustomEvent,
  IconComponent,
  NgxParentComponentDirective,
} from '@decaf-ts/for-angular';
import { ComponentEventNames, ElementPositions, IPagedComponentProperties } from '@decaf-ts/ui-decorators';
import { TranslatePipe } from '@ngx-translate/core';
import { AppAllowedForDirective } from 'src/app/directives/allowed-for.directive';
import { EPIDefaultWriterControlRole, IAccessControlRole, ITabItem } from 'src/app/utils';

@Dynamic()
@Component({
  selector: 'app-switcher',
  templateUrl: './switcher.component.html',
  styleUrls: ['./switcher.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppAllowedForDirective, IconComponent, ComponentRendererComponent],
})
export class AppSwitcherComponent extends NgxParentComponentDirective implements OnInit, OnDestroy {
  @Input()
  items: ITabItem[] = [];

  @Input()
  position: Extract<ElementPosition, 'top' | 'left'> = ElementPositions.top;

  @Input()
  mode: 'button' | 'toggle' | 'default' = 'default';

  @Input()
  type: 'tabs' | 'switcher' | 'column' = 'switcher';

  @Input()
  leafletParam: 'productCode' | 'batchNumber' = 'productCode';

  data: Partial<Model>[] | undefined;

  override value: string | undefined;

  override activeIndex: number = 0;
  accessControlRole: IAccessControlRole = EPIDefaultWriterControlRole;

  constructor() {
    super('SwitcherComponent');
  }

  async ngOnInit() {
    // await super.ngOnInit();
    // Initialize items based on children and existing items input
    if (!this.items.length || this.items.length < this.children.length) {
      this.items = this.children.map((child, index) => {
        const { props } = child;

        const tab = this.items[index];
        const { title, description, url, value, showTitle } = tab ? tab : props;
        return {
          title,
          description,
          value,
          url,
          index,
          showTitle: showTitle ?? true,
        } as IPagedComponentProperties;
      });
      if (this.type === 'switcher') {
        this.activePage = this.getActivePage(this.activeIndex);
      }
    }
    if (this.type === 'tabs') {
      this.items.forEach((item, index) => {
        const { url } = item;
        if (url && this.router.url.includes(url)) this.activeIndex = index;
      });
    }
    await super.initialize();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    this.data = event.data as Partial<Model>[];
    this.listenEvent.emit(event);
  }

  override async ngOnDestroy(): Promise<void> {
    await super.ngOnDestroy();
    if (this.timerSubscription) this.timerSubscription.unsubscribe();
  }

  async handleNavigateToLeaflet() {
    const param = `${this.modelId ? `?${this.leafletParam}=${this.modelId}` : ''}`;
    await this.router.navigateByUrl(`/leaflets/create${param}`);
  }

  async navigate(page: number): Promise<void | boolean> {
    const { url, value } = this.items[page];
    if (url) return await this.router.navigateByUrl(url || '/');
    if (value !== this.value) {
      this.value = value;
      this.activeIndex = page;
      this.listenEvent.emit({
        name: ComponentEventNames.Change,
        data: value,
        component: this.constructor.name,
      });
    }
  }
}
