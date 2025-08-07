#!/usr/bin/env tsx
/**
 * Test mock responses to ensure they match production format
 */

import { setupServer } from 'msw/node';
import { handlers } from '../tests/mocks/server.js';
import { IncidentIQClient } from '../src/api/client.js';

async function testMockResponses() {
  // Start MSW server
  const server = setupServer(...handlers);
  server.listen({ onUnhandledRequest: 'warn' });

  console.log('🧪 Testing Mock Responses Against Client');
  console.log('=' .repeat(60));

  const client = new IncidentIQClient('https://test.incidentiq.com/api/v1.0', 'test-api-key');

  // Test GET endpoints
  const tests = [
    { name: 'Ticket Statuses', method: () => client.getTicketStatuses() },
    { name: 'Ticket Priorities', method: () => client.getTicketPriorities() },
    { name: 'Ticket Categories', method: () => client.getTicketCategories() },
    { name: 'User Agents', method: () => client.getAgents() },
    { name: 'All Locations', method: () => client.getAllLocations() },
    { name: 'Asset Counts', method: () => client.getAssetCounts() },
  ];

  for (const test of tests) {
    try {
      console.log(`\n📌 ${test.name}:`);
      const result = await test.method();
      
      if (Array.isArray(result)) {
        console.log(`  ✅ Returns array with ${result.length} items`);
        if (result.length > 0) {
          console.log(`  📄 Sample item keys: ${Object.keys(result[0]).slice(0, 3).join(', ')}`);
        }
      } else if (typeof result === 'object') {
        console.log(`  ✅ Returns object with keys: ${Object.keys(result).join(', ')}`);
      } else {
        console.log(`  ⚠️ Unexpected type: ${typeof result}`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Test POST endpoints
  console.log('\n\n🔍 Testing POST Search Endpoints');
  console.log('-'.repeat(40));

  const searchTests = [
    { 
      name: 'Search Tickets', 
      method: () => client.searchTickets({ PageSize: 5, OnlyShowDeleted: false })
    },
    { 
      name: 'Search Users', 
      method: () => client.searchUsers({ PageSize: 5, OnlyShowDeleted: false })
    },
    { 
      name: 'Search Assets', 
      method: () => client.searchAssets({ PageSize: 5, OnlyShowDeleted: false })
    },
  ];

  for (const test of searchTests) {
    try {
      console.log(`\n📌 ${test.name}:`);
      const result = await test.method();
      
      console.log(`  ✅ Has Items: ${!!result.Items}`);
      console.log(`  ✅ Item Count: ${result.Items?.length || 0}`);
      console.log(`  ✅ Total Count: ${result.TotalCount || result.ItemCount || 0}`);
      console.log(`  ✅ Has Paging: ${!!result.Paging}`);
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  server.close();
  console.log('\n\n✅ Mock response testing complete!');
}

testMockResponses().catch(console.error);