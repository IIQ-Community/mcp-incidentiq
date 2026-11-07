export interface IIQApiResponse<T> {
  Data?: T;
  Success: boolean;
  Message?: string;
  ErrorMessage?: string;
  ErrorCode?: string;
}

/** IIQ search facet: entity facets (agent, team, ...) take an `Id`; text facets (keyword, email) take a `Value`. */
export type IIQFilter =
  | { Facet: string; Id: string; Negative?: boolean }
  | { Facet: string; Value: string; Negative?: boolean };

export interface IIQPaginationParams {
  PageIndex?: number;
  PageSize?: number;
  SortColumn?: string;
  SortDirection?: 'Ascending' | 'Descending';
}

export interface IIQSearchParams extends IIQPaginationParams {
  Filters?: IIQFilter[] | any[];
  SearchText?: string;
}

export interface IIQPagedResult<T> {
  Items: T[];
  TotalCount: number;
  PageIndex: number;
  PageSize: number;
  /** Set when the source list was too large to read completely (TotalCount may undercount). */
  Truncated?: boolean;
}

export interface PaginatedRequest {
  OnlyShowDeleted?: boolean;
  FilterByViewPermission?: boolean;
  SearchText?: string;
  Filters?: IIQFilter[];
  Paging?: {
    PageIndex: number;
    PageSize: number;
  };
}

export interface PaginatedResponse<T> {
  Items: T[];
  ItemCount: number;
  Paging?: {
    PageIndex: number;
    PageCount: number;
    PageSize: number;
    /** Total matching rows across all pages; `ItemCount` is only this page's count. */
    TotalRows?: number;
  };
}

export interface TicketSearchArgs {
  searchText?: string;
  onlyShowDeleted?: boolean;
  pageSize?: number;
  pageIndex?: number;
  statusIds?: string[];
  agentIds?: string[];
  agentEmails?: string[];
  teamIds?: string[];
  locationIds?: string[];
}

export interface IIQLocation {
  LocationId: string;
  LocationName: string;
  Name?: string; // Alternative name property
  LocationTypeName?: string;
  ParentLocationId?: string;
  BuildingName?: string;
  RoomNumber?: string;
  Abbreviation?: string;
  Floor?: string;
}

export interface IIQUser {
  UserId: string;
  Username?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  /** Display name IIQ actually sends (verified 2026-11-07). */
  Name?: string;
  /** IIQ sends the role as an object (verified 2026-11-07); there is no UserTypeName. */
  Role?: { RoleId?: string; Name?: string };
  RoleId?: string;
  LocationId?: string;
  LocationName?: string;
  IsActive?: boolean;
  Homeroom?: string;
  Grade?: string;
  /** Phone number field IIQ actually sends (verified 2026-11-07); there is no PhoneNumber or MobileNumber. */
  Phone?: string;
  /** Sent by GET /users/{id} only (verified 2026-11-07). */
  HomePhone?: string;
  JobTitle?: string;
}

export interface IIQAsset {
  AssetId: string;
  AssetTag: string;
  SerialNumber?: string;
  AssetTypeName?: string;
  LocationId?: string;
  /** Sent by POST /assets search rows, not by the exact tag/serial lookups (verified 2026-11-07). */
  WarrantyExpirationDate?: string;
  Notes?: string;
  /** Names arrive in nested objects (verified 2026-11-07); IIQ sends no flat ModelName/StatusName/AssignedUserName. */
  Model?: { Name?: string; Manufacturer?: { Name?: string } };
  Status?: { Name?: string };
  Location?: { Name?: string };
  Owner?: { Name?: string };
  /** Also sent by the tag/serial/user/room asset endpoints (verified 2026-11-07). */
  OwnerId?: string;
  LocationRoomId?: string;
  LocationRoom?: { Name?: string };
  FundingSourceId?: string;
  FundingSource?: { Name?: string };
  PurchasedDate?: string;
  StorageUnitNumber?: string;
}

export interface IIQTicket {
  TicketId: string;
  TicketNumber?: number;
  Subject?: string;
  Description?: string;
  StatusId?: string;
  StatusName?: string;
  PriorityId?: string;
  PriorityName?: string;
  CategoryId?: string;
  CategoryName?: string;
  LocationId?: string;
  LocationName?: string;
  RequestorId?: string;
  RequestorName?: string;
  AssignedToId?: string;
  AssignedToName?: string;
  CreatedDate?: string;
  ModifiedDate?: string;
  DueDate?: string;
  ClosedDate?: string;
  AssetId?: string;
  AssetTag?: string;
  CustomFields?: Record<string, any>;
}

export interface Ticket {
  TicketId: string;
  TicketNumber: number;
  Subject: string;
  Description?: string;
  Status: string;
  StatusId?: string;
  StatusName?: string;
  /** Live search-list items carry their status here, not in a top-level StatusId. */
  WorkflowStep?: TicketWorkflowStep;
  Priority?: string;
  CreatedDate: string;
  ModifiedDate?: string;
  RequestorName?: string;
  AssignedToName?: string;
  LocationName?: string;
  IsUrgent?: boolean;
  IsSensitive?: boolean;
  DueDate?: string;
  ClosedDate?: string;
}

/** A ticket's workflow position; `StatusId` matches `TicketStatusTypeId` from GET /tickets/statuses. */
export interface TicketWorkflowStep {
  StatusId?: string;
  StatusName?: string;
  StepName?: string;
}

/** Full ticket from GET /tickets/{TicketId} (Swagger `Ticket`); display fields are nested objects, unlike the flat search-list Ticket. */
export interface TicketDetail {
  TicketId: string;
  TicketNumber: string;
  Subject?: string;
  IssueDescription?: string;
  CreatedDate?: string;
  WorkflowStep?: { StepName?: string; StatusName?: string };
  PriorityLevel?: { Name?: string };
  For?: { Name?: string };
  AssignedToUser?: { Name?: string };
  AssignedToTeam?: { TeamName?: string };
  Location?: { Name?: string };
  IsUrgent?: boolean;
  HasSensitiveInformation?: boolean;
}

/** Single-item envelope IIQ wraps GET-by-id responses in (Swagger `ItemGetResponseOf*`). */
export interface IIQItemResponse<T> {
  Item?: T | null;
}

export interface IIQTicketCreate {
  Subject: string;
  Description: string;
  CategoryId?: string;
  PriorityId?: string;
  LocationId?: string;
  RequestorId?: string;
  AssignedToId?: string;
  AssetId?: string;
  DueDate?: string;
  CustomFields?: Record<string, any>;
}

export interface IIQTicketUpdate {
  Subject?: string;
  Description?: string;
  StatusId?: string;
  PriorityId?: string;
  CategoryId?: string;
  AssignedToId?: string;
  DueDate?: string;
  CustomFields?: Record<string, any>;
}

export interface IIQTicketStatus {
  StatusId: string;
  StatusName: string;
  StatusType?: string;
  IsDefault?: boolean;
  IsResolved?: boolean;
  IsClosed?: boolean;
}

/** Item from GET /tickets/statuses (live shape verified 2026-11-06). */
export interface TicketStatus {
  TicketStatusTypeId: string;
  StatusName: string;
  StepName?: string;
  IsClosed?: boolean;
  IsDeleted?: boolean;
}

export interface IIQTicketCategory {
  CategoryId: string;
  CategoryName: string;
  ParentCategoryId?: string;
  Description?: string;
  IsActive?: boolean;
}

export interface IIQTicketPriority {
  PriorityId: string;
  PriorityName: string;
  SortOrder?: number;
  Color?: string;
}

export interface TicketPriority {
  TicketPriorityId: string;
  Name: string;
  Level: number;
  SortOrder?: number;
  Color?: string;
}

export interface IIQCustomField {
  CustomFieldId: string;
  FieldName: string;
  FieldType: string;
  IsRequired: boolean;
  Options?: string[];
  DefaultValue?: any;
}

export interface IIQAnalyticsReport {
  ReportId: string;
  ReportName: string;
  ReportType: string;
  Data: any[];
  GeneratedDate: string;
  Parameters?: Record<string, any>;
}

export interface IIQPart {
  PartId: string;
  PartNumber: string;
  PartName: string;
  Description?: string;
  ManufacturerId?: string;
  ManufacturerName?: string;
  Quantity?: number;
  MinimumQuantity?: number;
  Cost?: number;
  LocationId?: string;
  LocationName?: string;
}

export interface IIQDeviceCollection {
  CollectionId: string;
  CollectionName: string;
  CollectionType?: string;
  StartDate?: string;
  EndDate?: string;
  LocationId?: string;
  LocationName?: string;
  TotalDevices?: number;
  CollectedDevices?: number;
  Status?: string;
}