import {DEMO_CASES} from '../demo-data.js';
export default function handler(req,res){const total=DEMO_CASES.length;const recurring=DEMO_CASES.filter(x=>x.urgency==='priority review').length;const inProgress=DEMO_CASES.filter(x=>x.status==='In progress').length;const resolved=DEMO_CASES.filter(x=>x.status==='Resolved').length;res.json({total,recurring,inProgress,resolved});}
