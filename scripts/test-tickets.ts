#!/usr/bin/env tsx
/**
 * Test Tickets API Endpoints
 * Tests corrected patterns based on API documentation
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

async function testTickets() {
  console.log('🎫 Testing Ticket Endpoints');
  console.log('=' .repeat(50));
  console.log(`📍 API: ${process.env.IIQ_API_BASE_URL}`);
  console.log('=' .repeat(50));

  const client = new IncidentIQClient(
    process.env.IIQ_API_BASE_URL,
    process.env.IIQ_API_KEY
  );

  // Test 1: Search tickets with new endpoint pattern
  console.log('\n1️⃣ Testing Ticket Search (POST /tickets/-/-/All)...');
  try {
    const tickets = await client.searchTickets({
      PageSize: 5,
      OrderBy: 'TicketCreatedDate',
      Direction: 'Descending'
    });
    
    console.log(`✅ Found ${tickets.Items?.length || 0} tickets`);
    
    if (tickets.Items && tickets.Items.length > 0) {
      const firstTicket = tickets.Items[0];
      console.log('\nFirst ticket details:');
      console.log(`  - ID: ${firstTicket.TicketId}`);
      console.log(`  - Number: ${firstTicket.TicketNumber}`);
      console.log(`  - Subject: ${firstTicket.Subject}`);
      console.log(`  - Status: ${firstTicket.StatusName}`);
      console.log(`  - Created: ${firstTicket.CreatedDate}`);
      console.log(`  - For: ${firstTicket.ForUser?.FullName || 'N/A'}`);
      
      // Test 2: Get specific ticket details
      if (firstTicket.TicketId) {
        console.log(`\n2️⃣ Testing Get Ticket Details (GET /tickets/${firstTicket.TicketId})...`);
        try {
          const ticketDetails = await client.getTicket(firstTicket.TicketId);
          if (ticketDetails) {
            console.log(`✅ Retrieved ticket details`);
            console.log(`  - Description: ${ticketDetails.Description?.substring(0, 100) || 'N/A'}...`);
            console.log(`  - Priority: ${ticketDetails.PriorityName || 'N/A'}`);
            console.log(`  - Category: ${ticketDetails.CategoryName || 'N/A'}`);
            console.log(`  - Location: ${ticketDetails.LocationName || 'N/A'}`);
          } else {
            console.log('⚠️ No details returned');
          }
        } catch (error: any) {
          console.log(`❌ Error: ${error.response?.status || error.message}`);
        }
      }
    } else {
      console.log('⚠️ No tickets found to test details endpoint');
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 3: Test ticket metadata endpoints
  console.log('\n3️⃣ Testing Ticket Statuses...');
  try {
    const statuses = await client.getTicketStatuses();
    console.log(`${statuses.length > 0 ? '✅' : '⚠️'} Found ${statuses.length} statuses`);
    if (statuses.length > 0) {
      console.log('  Statuses:', statuses.map(s => s.StatusName).join(', '));
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
  }

  console.log('\n4️⃣ Testing Ticket Categories...');
  try {
    const categories = await client.getTicketCategories();
    console.log(`${categories.length > 0 ? '✅' : '⚠️'} Found ${categories.length} categories`);
    if (categories.length > 0) {
      console.log('  Categories:', categories.slice(0, 5).map(c => c.CategoryName).join(', '));
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
  }

  console.log('\n5️⃣ Testing Ticket Priorities...');
  try {
    const priorities = await client.getTicketPriorities();
    console.log(`${priorities.length > 0 ? '✅' : '⚠️'} Found ${priorities.length} priorities`);
    if (priorities.length > 0) {
      console.log('  Priorities:', priorities.map(p => p.PriorityName).join(', '));
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Ticket endpoint testing complete');
}

// Run tests
testTickets().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});