#!/usr/bin/env tsx
/**
 * Production API Validation Script
 * Tests all read-only endpoints against production IncidentIQ instance
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
  category: string;
  endpoint: string;
  method: string;
  status: 'success' | 'failure' | 'empty';
  count?: number;
  message: string;
  sample?: any;
}

const results: TestResult[] = [];

async function validateProduction() {
  console.log('🔍 IncidentIQ Production API Validation');
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
  // TICKETS
  // =======================
  console.log('\n📋 TICKETS');
  console.log('-' .repeat(40));

  // Search tickets
  console.log('Testing: POST /tickets');
  try {
    const tickets = await client.searchTickets({
      PageSize: 5
    });
    const count = tickets.Items?.length || 0;
    results.push({
      category: 'Tickets',
      endpoint: '/tickets',
      method: 'POST',
      status: count > 0 ? 'success' : 'empty',
      count,
      message: `Found ${count} tickets`,
      sample: tickets.Items?.[0]
    });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} Found ${count} tickets`);
    
    if (tickets.Items && tickets.Items.length > 0) {
      const ticket = tickets.Items[0];
      console.log(`     Sample: #${ticket.TicketNumber} - ${ticket.Subject?.substring(0, 50)}...`);
    }
  } catch (error: any) {
    results.push({
      category: 'Tickets',
      endpoint: '/tickets',
      method: 'POST',
      status: 'failure',
      message: error.response?.status || error.message
    });
    console.log(`  ❌ Error: ${error.response?.status || error.message}`);
  }

  // =======================
  // USERS
  // =======================
  console.log('\n👥 USERS');
  console.log('-' .repeat(40));

  // Search users
  console.log('Testing: POST /users');
  try {
    const users = await client.searchUsers({
      PageSize: 5
    });
    const count = users.Items?.length || 0;
    results.push({
      category: 'Users',
      endpoint: '/users',
      method: 'POST',
      status: count > 0 ? 'success' : 'empty',
      count,
      message: `Found ${count} users`,
      sample: users.Items?.[0]
    });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} Found ${count} users`);
    
    if (users.Items && users.Items.length > 0) {
      const user = users.Items[0];
      console.log(`     Sample: ${user.FullName} (${user.Email || 'No email'})`);
    }
  } catch (error: any) {
    results.push({
      category: 'Users',
      endpoint: '/users',
      method: 'POST',
      status: 'failure',
      message: error.response?.status || error.message
    });
    console.log(`  ❌ Error: ${error.response?.status || error.message}`);
  }

  // Get agents
  console.log('Testing: GET /users/agents');
  try {
    const agents = await client.getAgents();
    const count = agents?.length || 0;
    results.push({
      category: 'Users',
      endpoint: '/users/agents',
      method: 'GET',
      status: count > 0 ? 'success' : 'empty',
      count,
      message: `Found ${count} agents`,
      sample: agents?.[0]
    });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} Found ${count} agents`);
  } catch (error: any) {
    results.push({
      category: 'Users',
      endpoint: '/users/agents',
      method: 'GET',
      status: 'failure',
      message: error.response?.status || error.message
    });
    console.log(`  ❌ Error: ${error.response?.status || error.message}`);
  }

  // =======================
  // ASSETS
  // =======================
  console.log('\n💻 ASSETS');
  console.log('-' .repeat(40));

  // Search assets
  console.log('Testing: POST /assets');
  try {
    const assets = await client.searchAssets({
      PageSize: 5
    });
    const count = assets.Items?.length || 0;
    results.push({
      category: 'Assets',
      endpoint: '/assets',
      method: 'POST',
      status: count > 0 ? 'success' : 'empty',
      count,
      message: `Found ${count} assets`,
      sample: assets.Items?.[0]
    });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} Found ${count} assets`);
    
    if (assets.Items && assets.Items.length > 0) {
      const asset = assets.Items[0];
      console.log(`     Sample: ${asset.AssetTag} - ${asset.Name || asset.AssetTypeName}`);
    }
  } catch (error: any) {
    results.push({
      category: 'Assets',
      endpoint: '/assets',
      method: 'POST',
      status: 'failure',
      message: error.response?.status || error.message
    });
    console.log(`  ❌ Error: ${error.response?.status || error.message}`);
  }

  // =======================
  // LOCATIONS
  // =======================
  console.log('\n🏫 LOCATIONS');
  console.log('-' .repeat(40));

  // Get all locations
  console.log('Testing: GET /locations/all');
  try {
    const locations = await client.getAllLocations();
    const count = locations?.length || 0;
    results.push({
      category: 'Locations',
      endpoint: '/locations/all',
      method: 'GET',
      status: count > 0 ? 'success' : 'empty',
      count,
      message: `Found ${count} locations`,
      sample: locations?.[0]
    });
    console.log(`  ${count > 0 ? '✅' : '⚠️'} Found ${count} locations`);
    
    if (locations && locations.length > 0) {
      console.log(`     Sample: ${locations[0].LocationName}`);
    }
  } catch (error: any) {
    results.push({
      category: 'Locations',
      endpoint: '/locations/all',
      method: 'GET',
      status: 'failure',
      message: error.response?.status || error.message
    });
    console.log(`  ❌ Error: ${error.response?.status || error.message}`);
  }

  // =======================
  // SUMMARY
  // =======================
  console.log('\n' + '=' .repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('=' .repeat(60));
  
  const byCategory = results.reduce((acc, r) => {
    if (!acc[r.category]) {
      acc[r.category] = { success: 0, empty: 0, failure: 0, total: 0 };
    }
    acc[r.category][r.status]++;
    acc[r.category].total++;
    return acc;
  }, {} as Record<string, any>);

  Object.entries(byCategory).forEach(([category, stats]: [string, any]) => {
    console.log(`\n${category}:`);
    console.log(`  ✅ Success: ${stats.success}/${stats.total}`);
    console.log(`  ⚠️  Empty: ${stats.empty}/${stats.total}`);
    console.log(`  ❌ Failed: ${stats.failure}/${stats.total}`);
  });

  const totalSuccess = results.filter(r => r.status === 'success').length;
  const totalEmpty = results.filter(r => r.status === 'empty').length;
  const totalFailed = results.filter(r => r.status === 'failure').length;
  
  console.log('\n' + '-' .repeat(60));
  console.log('Overall Results:');
  console.log(`  ✅ Working endpoints: ${totalSuccess}/${results.length}`);
  console.log(`  ⚠️  Empty responses: ${totalEmpty}/${results.length}`);
  console.log(`  ❌ Failed endpoints: ${totalFailed}/${results.length}`);

  // Save detailed report
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    endpoint: process.env.IIQ_API_BASE_URL,
    district: process.env.IIQ_API_BASE_URL?.split('.')[0]?.split('//')[1],
    summary: {
      total: results.length,
      success: totalSuccess,
      empty: totalEmpty,
      failed: totalFailed
    },
    results,
    recommendations: []
  };

  // Add recommendations based on results
  if (totalEmpty > 0) {
    report.recommendations.push('Some endpoints return empty data - check API permissions or data availability');
  }
  if (totalFailed > 0) {
    report.recommendations.push('Failed endpoints may require different API versions or additional permissions');
  }
  if (totalSuccess === results.length) {
    report.recommendations.push('All endpoints working correctly - ready for production use');
  }

  const reportPath = path.join(process.cwd(), 'context', `production-validation-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log('\n✅ Production validation complete');
}

// Run validation
validateProduction().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});