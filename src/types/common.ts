export interface IIQApiResponse<T> {
  Data?: T;
  Success: boolean;
  Message?: string;
  ErrorMessage?: string;
  ErrorCode?: string;
}

export interface IIQFilter {
  Facet: string;
  Id: string;
  Negative?: boolean;
}

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
}

export interface IIQLocation {
  LocationId: string;
  LocationName: string;
  LocationTypeName?: string;
  ParentLocationId?: string;
  BuildingName?: string;
  RoomNumber?: string;
}

export interface IIQUser {
  UserId: string;
  Username?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Role?: string;
  LocationId?: string;
  LocationName?: string;
  IsActive?: boolean;
  UserTypeName?: string;
  Grade?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
}

export interface IIQAsset {
  AssetId: string;
  AssetTag: string;
  SerialNumber?: string;
  AssetTypeName?: string;
  ModelName?: string;
  ManufacturerName?: string;
  StatusName?: string;
  LocationId?: string;
  LocationName?: string;
  AssignedUserId?: string;
  AssignedUserName?: string;
  PurchaseDate?: string;
  WarrantyExpirationDate?: string;
  Notes?: string;
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