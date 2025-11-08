// src/services/enhancedPoliticalIntelligence.ts
// PHASE 7B: Track committee assignments, lobbying data, campaign contributions, voting records

import axios from 'axios';

interface PoliticalData {
  source: string;
  type: 'committee_assignment' | 'lobbying_activity' | 'campaign_contribution' | 'voting_record';
  timestamp: Date;
  title: string;
  content: string;
  ticker?: string;
  politician?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class EnhancedPoliticalIntelligenceService {
  
  /**
   * Fetch all enhanced political intelligence
   */
  async fetchAll(): Promise<PoliticalData[]> {
    console.log('🏛️ Fetching enhanced political intelligence...');
    
    const allData: PoliticalData[] = [];
    
    try {
      // Fetch committee assignments
      const committees = await this.fetchCommitteeData();
      allData.push(...committees);
      
      // Fetch lobbying activity
      const lobbying = await this.fetchLobbyingData();
      allData.push(...lobbying);
      
      // Fetch campaign contributions
      const contributions = await this.fetchCampaignContributions();
      allData.push(...contributions);
      
      // Fetch voting records correlated with trades
      const votes = await this.fetchVotingRecords();
      allData.push(...votes);
      
      console.log(`✅ Enhanced political intelligence: ${allData.length} items`);
      return allData;
      
    } catch (error: any) {
      console.error('❌ Enhanced political intelligence error:', error.message);
      return allData;
    }
  }

  /**
   * Fetch committee assignments
   * Knowing who sits on which committees helps predict trades
   * Example: Tech committee member buying tech stocks
   */
  async fetchCommitteeData(): Promise<PoliticalData[]> {
    const data: PoliticalData[] = [];
    
    try {
      // Mock committee data (use Congress.gov API in production)
      const mockCommittees = [
        {
          politician: 'Nancy Pelosi',
          committee: 'House Financial Services Committee',
          subcommittee: 'Fintech Task Force',
          sectors: ['Finance', 'Tech', 'Crypto'],
          recentActivity: 'Hearing on AI regulation in financial services'
        },
        {
          politician: 'Elizabeth Warren',
          committee: 'Senate Banking Committee',
          subcommittee: 'Securities, Insurance, and Investment',
          sectors: ['Banking', 'Insurance', 'Investment'],
          recentActivity: 'Crypto regulation hearings'
        },
        {
          politician: 'Marjorie Taylor Greene',
          committee: 'House Oversight Committee',
          subcommittee: 'Energy and Environment',
          sectors: ['Energy', 'Oil & Gas', 'Renewables'],
          recentActivity: 'Energy policy discussions'
        }
      ];
      
      mockCommittees.forEach(committee => {
        data.push({
          source: 'Congressional Committee',
          type: 'committee_assignment',
          timestamp: new Date(),
          title: `${committee.politician} on ${committee.committee}`,
          content: `${committee.politician} serves on ${committee.committee} (${committee.subcommittee}), overseeing ${committee.sectors.join(', ')} sectors. Recent activity: ${committee.recentActivity}. Watch for trades in these sectors.`,
          politician: committee.politician,
          sentiment: 'neutral',
          metadata: {
            committee: committee.committee,
            subcommittee: committee.subcommittee,
            sectors: committee.sectors,
            recentActivity: committee.recentActivity
          }
        });
      });
      
      console.log(`✅ Committee data: ${data.length} assignments`);
      
    } catch (error: any) {
      console.warn('⚠️ Committee data unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch lobbying activity
   * Track which companies are lobbying which politicians
   * Example: Tech companies lobbying before AI regulation vote
   */
  async fetchLobbyingData(): Promise<PoliticalData[]> {
    const data: PoliticalData[] = [];
    
    try {
      // Mock lobbying data (use OpenSecrets API in production)
      const mockLobbying = [
        {
          company: 'Apple Inc.',
          ticker: 'AAPL',
          amount: 8_500_000,
          quarter: 'Q3 2024',
          issues: ['AI regulation', 'Data privacy', 'Antitrust'],
          politicians: ['Nancy Pelosi', 'Chuck Schumer']
        },
        {
          company: 'Meta Platforms',
          ticker: 'META',
          amount: 6_200_000,
          quarter: 'Q3 2024',
          issues: ['Social media regulation', 'Section 230'],
          politicians: ['Ted Cruz', 'Amy Klobuchar']
        },
        {
          company: 'ExxonMobil',
          ticker: 'XOM',
          amount: 4_800_000,
          quarter: 'Q3 2024',
          issues: ['Energy policy', 'Climate regulation'],
          politicians: ['Joe Manchin', 'Marjorie Taylor Greene']
        }
      ];
      
      mockLobbying.forEach(lobby => {
        data.push({
          source: 'Lobbying Disclosure',
          type: 'lobbying_activity',
          timestamp: new Date(),
          title: `${lobby.company} lobbying on ${lobby.issues[0]}`,
          content: `${lobby.company} (${lobby.ticker}) spent $${(lobby.amount / 1_000_000).toFixed(1)}M on lobbying in ${lobby.quarter}. Focus areas: ${lobby.issues.join(', ')}. Key contacts: ${lobby.politicians.join(', ')}. Significant lobbying often precedes favorable legislation.`,
          ticker: lobby.ticker,
          sentiment: 'bullish',
          metadata: {
            company: lobby.company,
            amount: lobby.amount,
            quarter: lobby.quarter,
            issues: lobby.issues,
            politicians: lobby.politicians
          }
        });
      });
      
      console.log(`✅ Lobbying data: ${data.length} reports`);
      
    } catch (error: any) {
      console.warn('⚠️ Lobbying data unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch campaign contributions
   * Track which companies/sectors fund which politicians
   */
  async fetchCampaignContributions(): Promise<PoliticalData[]> {
    const data: PoliticalData[] = [];
    
    try {
      // Mock contribution data (use FEC or OpenSecrets API)
      const mockContributions = [
        {
          politician: 'Nancy Pelosi',
          topDonors: [
            { sector: 'Tech', amount: 2_500_000, companies: ['AAPL', 'GOOGL', 'MSFT'] },
            { sector: 'Finance', amount: 1_800_000, companies: ['JPM', 'GS', 'BAC'] }
          ],
          cycle: '2024'
        },
        {
          politician: 'Mitch McConnell',
          topDonors: [
            { sector: 'Energy', amount: 3_200_000, companies: ['XOM', 'CVX', 'COP'] },
            { sector: 'Healthcare', amount: 2_100_000, companies: ['UNH', 'JNJ', 'PFE'] }
          ],
          cycle: '2024'
        }
      ];
      
      mockContributions.forEach(contrib => {
        contrib.topDonors.forEach(donor => {
          data.push({
            source: 'Campaign Finance',
            type: 'campaign_contribution',
            timestamp: new Date(),
            title: `${contrib.politician} received $${(donor.amount / 1_000_000).toFixed(1)}M from ${donor.sector}`,
            content: `${contrib.politician} received $${(donor.amount / 1_000_000).toFixed(1)}M from ${donor.sector} sector in ${contrib.cycle} cycle. Top contributors include companies in ${donor.companies.join(', ')}. Politicians often support industries that fund them.`,
            politician: contrib.politician,
            sentiment: 'neutral',
            metadata: {
              sector: donor.sector,
              amount: donor.amount,
              companies: donor.companies,
              cycle: contrib.cycle
            }
          });
        });
      });
      
      console.log(`✅ Campaign contributions: ${data.length} reports`);
      
    } catch (error: any) {
      console.warn('⚠️ Campaign contribution data unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Fetch voting records correlated with stock trades
   * Example: Vote YES on defense spending, then buy defense stocks
   */
  async fetchVotingRecords(): Promise<PoliticalData[]> {
    const data: PoliticalData[] = [];
    
    try {
      // Mock voting records (use Congress.gov API)
      const mockVotes = [
        {
          politician: 'Nancy Pelosi',
          bill: 'AI Innovation Act',
          vote: 'YES',
          billSummary: 'Funding for AI research and development',
          relatedSectors: ['Tech', 'AI'],
          tickers: ['NVDA', 'GOOGL', 'MSFT'],
          voteDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          stockTrade: {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            ticker: 'NVDA',
            action: 'BUY'
          }
        },
        {
          politician: 'Marjorie Taylor Greene',
          bill: 'Energy Independence Act',
          vote: 'YES',
          billSummary: 'Support for domestic oil production',
          relatedSectors: ['Energy', 'Oil & Gas'],
          tickers: ['XOM', 'CVX', 'COP'],
          voteDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          stockTrade: {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            ticker: 'XOM',
            action: 'BUY'
          }
        }
      ];
      
      mockVotes.forEach(vote => {
        const daysBetween = Math.floor(
          (vote.stockTrade.date.getTime() - vote.voteDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        data.push({
          source: 'Congressional Voting Record',
          type: 'voting_record',
          timestamp: vote.voteDate,
          title: `${vote.politician} voted ${vote.vote} on ${vote.bill}`,
          content: `${vote.politician} voted ${vote.vote} on ${vote.bill} (${vote.billSummary}), which affects ${vote.relatedSectors.join(', ')} sectors. ${daysBetween} days later, ${vote.politician} ${vote.stockTrade.action.toLowerCase()}ed ${vote.stockTrade.ticker}. Pattern: Vote favorable to sector → Trade in that sector.`,
          ticker: vote.stockTrade.ticker,
          politician: vote.politician,
          sentiment: vote.stockTrade.action === 'BUY' ? 'bullish' : 'bearish',
          metadata: {
            bill: vote.bill,
            vote: vote.vote,
            billSummary: vote.billSummary,
            relatedSectors: vote.relatedSectors,
            voteDate: vote.voteDate,
            stockTrade: vote.stockTrade,
            daysBetween: daysBetween
          }
        });
      });
      
      console.log(`✅ Voting records: ${data.length} correlated votes`);
      
    } catch (error: any) {
      console.warn('⚠️ Voting records unavailable:', error.message);
    }
    
    return data;
  }

  /**
   * Get political data for specific ticker
   */
  async getForTicker(ticker: string): Promise<PoliticalData[]> {
    const allData = await this.fetchAll();
    return allData.filter(item => 
      item.ticker?.toUpperCase() === ticker.toUpperCase() ||
      item.content.toUpperCase().includes(ticker.toUpperCase())
    );
  }
}

export default new EnhancedPoliticalIntelligenceService();
