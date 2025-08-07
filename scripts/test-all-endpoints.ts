#!/usr/bin/env tsx
/**
 * Comprehensive Test of All IIQ API Endpoints
 * Tests all endpoints found in PowerShell module against production
 */

import { IncidentIQClient } from '../src/api/client.js';
import path from 'path';
import fs from 'fs';

// Load environment from context/config/.env
const envPath = path.join(process.cwd(), 'context', 'config', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      process.env[key] = value;
    }
  }
}

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'failure' | 'empty';
  count?: number;
  error?: string;
  responseTime?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  endpoint: string,
  method: string,
  testFn: () => Promise<any>
): Promise<void> {
  const startTime = Date.now();
  console.log(`Testing ${method} ${endpoint}...`);
  
  try {
    const result = await testFn();
    const responseTime = Date.now() - startTime;
    
    let count = 0;
    let status: 'success' | 'empty' = 'empty';
    
    if (Array.isArray(result)) {
      count = result.length;
      status = count > 0 ? 'success' : 'empty';
    } else if (result?.Items) {
      count = result.Items.length;
      status = count > 0 ? 'success' : 'empty';
    } else if (result) {
      count = 1;
      status = 'success';
    }
    
    results.push({
      endpoint,
      method,
      status,
      count,
      responseTime
    });
    
    console.log(`  ${status === 'success' ? '✅' : '⚠️'} ${count} items (${responseTime}ms)`);
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    results.push({
      endpoint,
      method,
      status: 'failure',
      error: error.response?.status || error.message,
      responseTime
    });
    console.log(`  ❌ Error: ${error.response?.status || error.message} (${responseTime}ms)`);
  }
}

async function testAllEndpoints() {
  console.log('🔍 IncidentIQ API Comprehensive Endpoint Test');
  console.log('=' .repeat(60));
  console.log(`📍 API: ${process.env.IIQ_API_BASE_URL}`);
  console.log(`🔑 District: ${process.env.IIQ_API_BASE_URL?.split('.')[0]?.split('//')[1]}`);
  console.log('⚠️  READ-ONLY operations only - Production instance');
  console.log('=' .repeat(60));

  const client = new IncidentIQClient(
    process.env.IIQ_API_BASE_URL,
    process.env.IIQ_API_KEY
  );

  // =======================
  // WORKING ENDPOINTS (from previous validation)
  // =======================
  console.log('\n📋 CORE ENDPOINTS (Previously Validated)');
  console.log('-' .repeat(40));

  await testEndpoint('Tickets', '/tickets', 'POST', () =>
    client.searchTickets({ PageSize: 5 })
  );

  await testEndpoint('Users', '/users', 'POST', () =>
    client.searchUsers({ PageSize: 5 })
  );

  await testEndpoint('Assets', '/assets', 'POST', () =>
    client.searchAssets({ PageSize: 5 })
  );

  await testEndpoint('Locations All', '/locations/all', 'GET', () =>
    client.getAllLocations()
  );

  await testEndpoint('User Agents', '/users/agents', 'GET', () =>
    client.getAgents()
  );

  // =======================
  // NEW ENDPOINTS FROM PS MODULE
  // =======================
  console.log('\n🆕 NEW ENDPOINTS (From PowerShell Module)');
  console.log('-' .repeat(40));

  // Teams
  await testEndpoint('Teams All', '/teams/all', 'GET', () =>
    client.getAllTeams()
  );

  // Categories
  await testEndpoint('Categories', '/categories', 'POST', () =>
    client.searchCategories({ PageSize: 5 })
  );

  // Custom Fields
  await testEndpoint('Custom Fields (User)', '/custom-fields', 'POST', () =>
    client.searchCustomFields('User')
  );

  await testEndpoint('Custom Fields (Asset)', '/custom-fields', 'POST', () =>
    client.searchCustomFields('Asset')
  );

  await testEndpoint('Custom Fields (Ticket)', '/custom-fields', 'POST', () =>
    client.searchCustomFields('Ticket')
  );

  await testEndpoint('Custom Field Types', '/custom-fields/types', 'GET', () =>
    client.getCustomFieldTypes()
  );

  // Locations/Rooms
  await testEndpoint('Location Rooms', '/locations/rooms', 'GET', () =>
    client.getLocationRooms()
  );

  // Purchase Orders
  await testEndpoint('Purchase Orders', '/purchaseorders', 'GET', () =>
    client.getPurchaseOrders()
  );

  // Parts
  await testEndpoint('Parts', '/parts', 'GET', () =>
    client.getParts()
  );

  await testEndpoint('Parts Suppliers', '/parts/suppliers', 'GET', () =>
    client.getPartsSuppliers()
  );

  // Manufacturers
  await testEndpoint('Global Manufacturers', '/assets/manufacturers/global', 'GET', () =>
    client.getGlobalManufacturers()
  );

  // Issue Types
  await testEndpoint('Issue Types', '/issues/types', 'GET', () =>
    client.getIssueTypes()
  );

  // Ticket Metadata (additional)
  await testEndpoint('Ticket Statuses', '/tickets/statuses', 'GET', () =>
    client.getTicketStatuses()
  );

  await testEndpoint('Ticket Categories', '/tickets/categories', 'GET', () =>
    client.getTicketCategories()
  );

  await testEndpoint('Ticket Priorities', '/tickets/priorities', 'GET', () =>
    client.getTicketPriorities()
  );

  // =======================
  // SUMMARY
  // =======================
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successCount = results.filter(r => r.status === 'success').length;
  const emptyCount = results.filter(r => r.status === 'empty').length;
  const failureCount = results.filter(r => r.status === 'failure').length;
  
  console.log(`\n✅ Working endpoints: ${successCount}/${results.length}`);
  console.log(`⚠️  Empty responses: ${emptyCount}/${results.length}`);
  console.log(`❌ Failed endpoints: ${failureCount}/${results.length}`);
  
  // Group by status
  if (successCount > 0) {
    console.log('\n✅ Working Endpoints:');
    results
      .filter(r => r.status === 'success')
      .forEach(r => console.log(`  - ${r.method} ${r.endpoint} (${r.count} items, ${r.responseTime}ms)`));
  }
  
  if (emptyCount > 0) {
    console.log('\n⚠️  Empty Response Endpoints:');
    results
      .filter(r => r.status === 'empty')
      .forEach(r => console.log(`  - ${r.method} ${r.endpoint} (${r.responseTime}ms)`));
  }
  
  if (failureCount > 0) {
    console.log('\n❌ Failed Endpoints:');
    results
      .filter(r => r.status === 'failure')
      .forEach(r => console.log(`  - ${r.method} ${r.endpoint}: ${r.error} (${r.responseTime}ms)`));
  }

  // Calculate average response times
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  console.log(`\n⏱️  Average response time: ${Math.round(avgResponseTime)}ms`);

  // Save detailed report
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    endpoint: process.env.IIQ_API_BASE_URL,
    district: process.env.IIQ_API_BASE_URL?.split('.')[0]?.split('//')[1],
    summary: {
      total: results.length,
      success: successCount,
      empty: emptyCount,
      failed: failureCount,
      avgResponseTime: Math.round(avgResponseTime)
    },
    results,
    recommendations: []
  };

  // Add recommendations
  if (emptyCount > 0) {
    report.recommendations.push(`${emptyCount} endpoints return empty data - verify API permissions or data availability`);
  }
  if (failureCount > 0) {
    report.recommendations.push(`${failureCount} endpoints failed - check endpoint paths or authentication`);
  }
  
  // PowerShell module correlation
  const psModuleEndpoints = [
    '/tickets', '/users', '/assets', '/categories', '/custom-fields',
    '/teams/all', '/parts/suppliers', '/locations/rooms', '/purchaseorders',
    '/parts', '/assets/manufacturers/global', '/locations/all', '/issues/types',
    '/custom-fields/types'
  ];
  
  const workingPsEndpoints = results
    .filter(r => r.status === 'success' && psModuleEndpoints.includes(r.endpoint))
    .map(r => r.endpoint);
  
  report.recommendations.push(
    `PowerShell module compatibility: ${workingPsEndpoints.length}/${psModuleEndpoints.length} endpoints working`
  );

  const reportPath = path.join(process.cwd(), 'context', `endpoint-test-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log('\n✅ Comprehensive endpoint testing complete');
}

// Run tests
testAllEndpoints().catch(error => {
  console.error('Fatal error during testing:', error);
  process.exit(1);
});