import axios from 'axios';
import { generateContentHash, extractTickers } from '../../utils/dataUtils.js';
import liveStatusService from '../liveStatusService.js';

const SUBREDDITS = [
    { id: 'wsb', name: 'wallstreetbets' },
    { id: 'stocks', name: 'stocks' },
    { id: 'investing', name: 'investing' }
];

export async function collectSocialData() {
    const items: any[] = [];
    
    for (const sub of SUBREDDITS) {
        await liveStatusService.update(sub.id, 'scanning', `Scanning r/${sub.name}...`);
        try {
            const res = await axios.get(`https://www.reddit.com/r/${sub.name}/hot.json?limit=10`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            });
            const posts = res.data.data.children || [];
            
            if (posts.length > 0) {
                await liveStatusService.update(sub.id, 'new_data', `${posts.length} posts`, posts.length);
                
                for (const p of posts) {
                    const post = p.data;
                    items.push({
                        category: 'social',
                        source: `Reddit ${sub.name}`,
                        external_id: generateContentHash('Reddit', post.id, post.created_utc.toString()),
                        title: post.title,
                        content: post.selftext?.substring(0, 500) || post.title,
                        url: `https://reddit.com${post.permalink}`,
                        published_at: new Date(post.created_utc * 1000),
                        tickers: extractTickers(post.title),
                        raw_metadata: { score: post.score },
                        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    });
                }
            } else {
                 await liveStatusService.update(sub.id, 'cached', 'No new posts', 0);
            }
        } catch (e) {
            await liveStatusService.update(sub.id, 'cached', 'Access Limited', 0);
        }
        await new Promise(r => setTimeout(r, 500));
    }
    
    return items;
}
