#!/usr/bin/env tsx
/**
 * Analysis of PowerShell Module API Endpoints
 * Compares HPS.IIQ PowerShell module with current TypeScript implementation
 */

interface EndpointInfo {
  function: string;
  endpoint: string;
  method: 'GET' | 'POST';
  hasPayload: boolean;
  pagination: boolean;
  notes?: string;
}

// Endpoints found in PowerShell module
const psEndpoints: EndpointInfo[] = [
  // POST endpoints (using Send-IIQData)
  {
    function: 'Get-TicketData',
    endpoint: 'tickets',
    method: 'POST',
    hasPayload: true,
    pagination: true,
    notes: 'Uses OnlyShowDeleted and FilterByViewPermission'
  },
  {
    function: 'Get-UserData',
    endpoint: 'users',
    method: 'POST',
    hasPayload: true,
    pagination: true,
    notes: 'Uses OnlyShowDeleted and FilterByViewPermission'
  },
  {
    function: 'Get-AssetData',
    endpoint: 'assets',
    method: 'POST',
    hasPayload: true,
    pagination: true,
    notes: 'Uses OnlyShowDeleted and FilterByViewPermission'
  },
  {
    function: 'Get-CategoryData',
    endpoint: 'categories',
    method: 'POST',
    hasPayload: true,
    pagination: true,
    notes: 'Asset categories'
  },
  {
    function: 'Get-CustomFieldData',
    endpoint: 'custom-fields',
    method: 'POST',
    hasPayload: true,
    pagination: false,
    notes: 'Multiple calls for different entity types (User, Asset, Ticket, Room)'
  },
  
  // GET endpoints (using Get-IIQData)
  {
    function: 'Get-TeamData',
    endpoint: 'teams/all',
    method: 'GET',
    hasPayload: false,
    pagination: false,
    notes: 'Returns all teams'
  },
  {
    function: 'Get-SupplierData',
    endpoint: 'parts/suppliers',
    method: 'GET',
    hasPayload: false,
    pagination: false,
    notes: 'Parts suppliers for asset repairs'
  },
  {
    function: 'Get-RoomData',
    endpoint: 'locations/rooms',
    method: 'GET',
    hasPayload: false,
    pagination: true,
    notes: 'All rooms across locations'
  },
  {
    function: 'Get-PurchaseOrderData',
    endpoint: 'purchaseorders',
    method: 'GET',
    hasPayload: false,
    pagination: true,
    notes: 'Purchase orders for assets'
  },
  {
    function: 'Get-PartData',
    endpoint: 'parts',
    method: 'GET',
    hasPayload: false,
    pagination: true,
    notes: 'Parts inventory'
  },
  {
    function: 'Get-ManufacturerData',
    endpoint: 'assets/manufacturers/global',
    method: 'GET',
    hasPayload: false,
    pagination: false,
    notes: 'Global manufacturers list'
  },
  {
    function: 'Get-LocationData',
    endpoint: 'locations/all',
    method: 'GET',
    hasPayload: false,
    pagination: false,
    notes: 'All district locations'
  },
  {
    function: 'Get-IssueTypeData',
    endpoint: 'issues/types',
    method: 'GET',
    hasPayload: false,
    pagination: false,
    notes: 'Issue types for tickets'
  },
  {
    function: 'Get-CustomFieldTypeData',
    endpoint: 'custom-fields/types',
    method: 'GET',
    hasPayload: false,
    pagination: false,
    notes: 'Custom field type definitions'
  }
];

// Current TypeScript implementation status
const tsImplementationStatus = {
  // Implemented and working
  implemented: [
    'POST /tickets',
    'POST /users',
    'POST /assets',
    'GET /locations/all',
    'GET /users/agents'
  ],
  
  // Missing from TypeScript
  missing: [
    'POST /categories',
    'POST /custom-fields',
    'GET /teams/all',
    'GET /parts/suppliers',
    'GET /locations/rooms',
    'GET /purchaseorders',
    'GET /parts',
    'GET /assets/manufacturers/global',
    'GET /issues/types',
    'GET /custom-fields/types'
  ],
  
  // Incorrectly implemented
  incorrect: [
    // None found - the working endpoints use correct patterns
  ]
};

console.log('📊 PowerShell Module API Endpoint Analysis');
console.log('=' .repeat(60));

console.log('\n📋 Summary:');
console.log(`  Total PS endpoints: ${psEndpoints.length}`);
console.log(`  POST endpoints: ${psEndpoints.filter(e => e.method === 'POST').length}`);
console.log(`  GET endpoints: ${psEndpoints.filter(e => e.method === 'GET').length}`);

console.log('\n✅ Currently Implemented in TypeScript:');
tsImplementationStatus.implemented.forEach(endpoint => {
  console.log(`  - ${endpoint}`);
});

console.log('\n❌ Missing from TypeScript Implementation:');
tsImplementationStatus.missing.forEach(endpoint => {
  console.log(`  - ${endpoint}`);
});

console.log('\n📝 Endpoint Details:');
console.log('-' .repeat(60));

psEndpoints.forEach(ep => {
  const isImplemented = tsImplementationStatus.implemented.includes(`${ep.method} /${ep.endpoint}`);
  const status = isImplemented ? '✅' : '❌';
  
  console.log(`\n${status} ${ep.function}`);
  console.log(`   Method: ${ep.method}`);
  console.log(`   Endpoint: /${ep.endpoint}`);
  console.log(`   Payload: ${ep.hasPayload ? 'Yes' : 'No'}`);
  console.log(`   Pagination: ${ep.pagination ? 'Yes' : 'No'}`);
  if (ep.notes) {
    console.log(`   Notes: ${ep.notes}`);
  }
});

console.log('\n' + '=' .repeat(60));
console.log('🔧 Action Items:');
console.log('1. Implement missing endpoints in src/api/client.ts');
console.log('2. Add corresponding MCP tools for new endpoints');
console.log('3. Test all endpoints against production API');
console.log('4. Update tests to cover new functionality');

export { psEndpoints, tsImplementationStatus };