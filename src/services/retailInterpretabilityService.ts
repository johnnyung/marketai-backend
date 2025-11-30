interface RetailBadge {
  id: string;
  label: string;
  icon: string;
  color: 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'gray';
  description: string;
}

class RetailInterpretabilityService {

  /**
   * Transforms complex deep-brain signals into retail-friendly tags.
   */
  generateSimpleTags(analysis: any): RetailBadge[] {
    const badges: RetailBadge[] = [];
    const engines = analysis.analysis || {};
    const matrix = analysis.decision_matrix?.engines || {};

    // 1. WHALE / INSTITUTIONAL
    if (engines.shadow === 'ACCUMULATION' || matrix.shadow?.bias === 'ACCUMULATION') {
      badges.push({ id: 'whale_buy', label: 'Whale Buying', icon: '🐋', color: 'purple', description: 'Big money is quietly buying.' });
    } else if (engines.shadow === 'DISTRIBUTION' || matrix.shadow?.bias === 'DISTRIBUTION') {
      badges.push({ id: 'whale_sell', label: 'Whale Selling', icon: '🐋', color: 'red', description: 'Big money is quietly selling.' });
    }

    // 2. INSIDER ACTIVITY
    if (engines.insider === 'OPPORTUNISTIC' || engines.insider === 'COORDINATED') {
      badges.push({ id: 'insider_buy', label: 'Insiders Buying', icon: '🏛️', color: 'green', description: 'Executives are buying their own stock.' });
    }

    // 3. SENTIMENT / HYPE
    const sentimentScore = matrix.narrative?.score || engines.narrative || 0;
    if (sentimentScore > 75) {
      badges.push({ id: 'hot_money', label: 'Viral Hype', icon: '🔥', color: 'orange', description: 'This stock is trending heavily right now.' });
    }

    // 4. TECHNICALS
    if (analysis.confidence >= 90) {
      badges.push({ id: 'conviction', label: 'High Conviction', icon: '🎯', color: 'green', description: 'Our AI is very sure about this.' });
    }
    
    // 5. VOLATILITY (Gamma)
    if (engines.gamma === 'AMPLIFIED' || matrix.gex?.regime === 'AMPLIFIED') {
      badges.push({ id: 'vol_risk', label: 'Volatile', icon: '⚠️', color: 'red', description: 'Expect wild price swings.' });
    } else if (engines.gamma === 'SUPPRESSED') {
      badges.push({ id: 'pinned', label: 'Stable', icon: '🛡️', color: 'gray', description: 'Price is stuck in a range.' });
    }

    return badges;
  }

  /**
   * Generates a "Explain Like I'm 12" summary string.
   */
  generateELI12(analysis: any): string {
      const action = analysis.action || 'WATCH';
      const ticker = analysis.ticker;
      const engines = analysis.decision_matrix?.engines || analysis.analysis || {};
      
      let text = `We think ${ticker} is a ${action} because `;
      
      // Reason 1: Insiders
      if (engines.insider === 'OPPORTUNISTIC' || engines.insider_intent?.classification === 'OPPORTUNISTIC') {
          text += "the company bosses are buying shares with their own money. ";
      }
      
      // Reason 2: Whales
      if (engines.shadow === 'ACCUMULATION' || engines.shadow?.bias === 'ACCUMULATION') {
          text += "Big investors (whales) are quietly accumulating shares. ";
      }
      
      // Reason 3: Hype
      if ((engines.narrative?.score || 0) > 70) {
          text += "Lots of people are talking about it online right now. ";
      }

      // Reason 4: Technicals
      if (analysis.confidence > 85) {
          text += "Multiple data points line up perfectly. ";
      }

      // Risk Warning
      if (engines.gamma === 'AMPLIFIED' || engines.gex?.regime === 'AMPLIFIED') {
          text += "Be careful though, the price might jump around a lot.";
      } else {
          text += "It looks like a solid setup.";
      }

      return text;
  }
}

export default new RetailInterpretabilityService();
