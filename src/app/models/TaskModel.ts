import { TaskModel as BaseModel, column, createdAt, TaskStatus, TaskType } from '@decaf-ts/core';
import { id } from '@decaf-ts/db-decorators';
import { description, prop, uses } from '@decaf-ts/decoration';
import { date, min, model, type ModelArg, required } from '@decaf-ts/decorator-validation';
import { AxiosFlavour } from '@decaf-ts/for-http';
import { uielement, UIKeys, uilayout, uilistmodel, uitablecol } from '@decaf-ts/ui-decorators';

@uilistmodel('ngx-decaf-list-item')
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@uses(AxiosFlavour)
@model()
export class TaskModel extends BaseModel {
  @uielement({ label: 'tasks.userId' })
  @uitablecol(UIKeys.FIRST)
  @id()
  override id!: string;

  // required routing / identity
  @uielement({ label: 'tasks.atomicity' })
  override atomicity: TaskType = TaskType.ATOMIC;

  @required()
  @uielement({ label: 'tasks.classification' })
  @uitablecol()
  override classification!: string;

  @prop()
  @description('optional task name for ambiguity')
  @uielement({ label: 'tasks.name' })
  @uitablecol()
  override name?: string;

  // execution
  @required()
  @uielement({ label: 'tasks.status' })
  @uitablecol()
  override status: TaskStatus = TaskStatus.PENDING;

  // @prop()
  // @serialize(TaskIOSerializer)
  // @description('Holds task input')
  // input?: INPUT;

  // @prop()
  // @serialize(TaskIOSerializer)
  // @description('Holds the task output when successfully completed')
  // output?: OUTPUT;

  // @prop()
  // @serialize()
  // @description('Holds the error for failed tasks')
  // error?: TaskErrorModel;

  // retries
  @required()
  @min(0)
  @uielement({ label: 'tasks.attempt' })
  @uitablecol()
  override attempt: number = 0;

  @min(1)
  @required()
  @uielement({ label: 'tasks.maxAttempts' })
  @uitablecol()
  override maxAttempts!: number;

  // @required()
  // @serialize()
  // @description('backoff configuration')
  // backoff!: TaskBackoffModel;

  @date()
  @description('Next execution timestamp')
  @uielement({ label: 'tasks.nextRunAt' })
  override nextRunAt?: Date;

  @date()
  @uielement({ label: 'tasks.scheduledTo' })
  override scheduledTo?: Date;

  // worker lease / claim
  // @prop()
  // @description('Task lease owner identifier')
  // leaseOwner?: string;

  // @date()
  // @description('Task lease expiration timestamp')
  // leaseExpiry?: Date;

  // composite
  // @prop()
  // @serialize()
  // @description("Holds the various steps definition and inputs - only for type === 'composite'")
  // steps?: TaskStepSpecModel[]; // only for type === "composite"

  // @min(0)
  // @prop()
  // @description("Holds the current step - only for type === 'composite'")
  // currentStep?: number; // index of next step to run

  // @prop()
  // @serialize()
  // @description("Holds the step results - only for type === 'composite'")
  // stepResults?: TaskStepResultModel[];

  // @prop()
  // @serialize()
  // @description('Holds the task log entries')
  // logTail?: TaskLogEntryModel[] = [];

  /**
   * @description Creation timestamp for the model
   * @summary Automatically set to the current date and time when the model is created
   */
  @column()
  @createdAt()
  @description('timestamp of creation')
  @uielement({ label: 'crud.createdAt' })
  @uitablecol()
  override createdAt!: Date;

  /**
   * @description Last update timestamp for the model
   * @summary Automatically updated to the current date and time whenever the model is modified
   */
  // @column()
  // @updatedAt()
  // @description('timestamp of last update')
  // updatedAt!: Date;

  // @column()
  // @createdBy()
  // @description('Holds the creator of the task')
  // createdBy!: string;

  // @column()
  // @updatedBy()
  // @description('Holds the creator of the task')
  // updatedBy!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<TaskModel>) {
    super(arg);
  }
}
