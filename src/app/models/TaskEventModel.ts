import { TaskEventModel as BaseModel, pk, table, TaskEventType } from '@decaf-ts/core';
import { readonly } from '@decaf-ts/db-decorators';
import { uses } from '@decaf-ts/decoration';
import { date, required } from '@decaf-ts/decorator-validation';
import { AxiosFlavour } from '@decaf-ts/for-http';
import { uielement, uilayout } from '@decaf-ts/ui-decorators';
import { AdminTableNames } from '../utils/constants';

@table(AdminTableNames.tasksEvents)
// @uilistmodel('ngx-decaf-list-item', { icon: 'ti-subtask' })
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
// @model()
@uses(AxiosFlavour)
export class TaskEventModel extends BaseModel {
  @readonly()
  @uielement({ label: 'tasksEvents.taskId' })
  override uuid!: string;

  @readonly()
  @required()
  @uielement({ label: 'tasksEvents.taskId' })
  @pk()
  override taskId!: string;

  @date()
  @required()
  @uielement({ label: 'tasksEvents.ts' })
  override ts: Date = new Date();

  @readonly()
  @required()
  @uielement({ label: 'tasksEvents.classification' })
  override classification!: TaskEventType;

  // @prop()
  // @readonly()
  // override payload?: any;
}
