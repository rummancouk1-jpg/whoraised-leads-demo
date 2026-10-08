"""Author-reviewed decisions based on fresh source/contact evidence; never infer contacts."""
import csv, json, re
from pathlib import Path
from datetime import datetime, timezone

root=Path.cwd()
read=lambda name:json.loads((root/'data'/name).read_text(encoding='utf-8'))
source={r['slug']:r for r in read('creator-audit-source-loads.json')}
back_source={r['slug']:r for r in read('creator-backfill-source-loads.json')}
extra_source={r['slug']:r for r in read('creator-additional-source-loads.json')}
corrected=read('creator-corrected-loads.json')+read('creator-extra-loads.json')+read('creator-final-loads.json')
by_url={r['url']:r for r in corrected}
original=list(csv.DictReader((root/'data/creator-list-r1.csv').open(encoding='utf-8-sig',newline='')))
original=[r for r in original if not r['name'].startswith('EXAMPLE')]
assert len(original)==66
now=datetime.now(timezone.utc).isoformat()
# Contact URLs are published corporate inquiry forms or explicitly offered business routes.
# Named personal email addresses, generic social DMs and customer-only support routes are rejected.
contacts={
'tradebrigade':('https://tradebrigade.co/contact/','https://tradebrigade.co/contact/','Published company subject/message inquiry form'),
'fxevolutionvideo':('support@fxevolution.com',source['r1-fxevolutionvideo']['source_url'],'Channel explicitly labels this address Business enquiries'),
'alphatrends':('https://alphatrends.net/contact-us/','https://alphatrends.net/contact-us/','Published Alphatrends company inquiry form'),
'tradesbymatt':('partner@tbm.gg',source['r1-tradesbymatt']['source_url'],'Channel explicitly invites social-platform business partnerships'),
'chatwithtraderspodcast':('hello@chatwithtraders.com','https://chatwithtraders.com/sponsors','Sponsorship address explicitly offered by the podcast'),
'traderlion':('https://traderlion.com/contact/','https://traderlion.com/contact/','Public company message form; primary page loaded by web search reader; Chrome hit Cloudflare'),
'financialwisdom':('https://www.financialwisdomtv.com/contact','https://www.financialwisdomtv.com/contact','Public company questions/comments form'),
'optionstrat':('partners@optionstrat.com','https://optionstrat.com/contact','Explicit partnerships, press and business inquiry address; Cloudflare email decoded'),
'tradingdecoded':('https://tradingdecoded.com/contact','https://tradingdecoded.com/contact','Company form includes General Inquiry, separate from account/technical support'),
'benzinga':('partnerships@benzinga.com','https://www.benzinga.com/advertising/','Advertising page publishes partnership email and business form; rendered in Chrome'),
'traderisk':('https://www.thetraderisk.com/advertise/','https://www.thetraderisk.com/advertise/','Explicit brand partnership and campaign inquiry form'),
'bthetrader87':('https://www.bthetrader.com/contact','https://www.bthetrader.com/','Homepage Brand Partnerships & Collaborations directs to this form'),
'rockwelltradingservices':('referral@rockwelltrading.com','https://www.rockwelltrading.com/register-referral-partner-500/','Public business referral-partner manager address'),
'stockstotrade':('press@stockstotrade.com','https://stockstotrade.com/press/','Public press team address'),
'trendspider':('hello@trendspider.com','https://trendspider.com/contacts/','Company form explicitly includes Business inquiries'),
'stockchartstv':('https://stockcharts.com/advertise/','https://stockcharts.com/advertise/','Public advertising page directs business campaigns to its published contact form'),
'projectoption':('https://projectoption.com/contact','https://projectoption.com/contact','Company URL, subject and message form for general company inquiries'),
'optionswithdavis':('support@optionswithdavis.com','https://optionswithdavis.com/contact/','Page offers this role address for any inquiries; spelling publicly obfuscated, not guessed'),
'lighthousemacro':('advisory@lighthousemacro.com','https://lighthousemacro.com','Public corporate advisory inquiry route, separate from research subscription'),
'optionstrategist':('info@optionstrategist.com','https://www.optionstrategist.com/advertising','Explicit advertising and affiliate inquiries'),
'spotgamma':('media@spotgamma.com','https://spotgamma.com/contact/','Explicit Media role address, separate from support'),
'tanukitrade':('https://tanukitrade.com/contact.htm','https://tanukitrade.com/contact.htm','Public product-owner inquiry route for any questions; no guessed/private DM'),
'dd8njgqweq':('https://tanukitrade.com/contact.htm','https://tanukitrade.com/contact.htm','Same owner as TanukiTrade newsletter; public company inquiry route'),
'unusualwhales':('partnerships@unusualwhales.com','https://unusualwhales.com/about','Owner explicitly publishes advertising/data partnership address'),
'unusual-whales':('partnerships@unusualwhales.com','https://unusualwhales.com/about','Owner explicitly publishes advertising/data partnership address'),
}
fit={
'tradebrigade':('strong','Public channel offers pre-market stock analysis around US CPI/PCE/NFP releases.'),
'fxevolutionvideo':('strong','Public channel covers stocks, ETFs and options with CPI, FOMC and earnings market breakdowns.'),
'stockedup':('strong','Public channel publishes stock-market videos every trading day and options/watchlist strategies.'),
'alphatrends':('strong','Channel explicitly teaches technical analysis of the US stock market and individual stocks.'),
'tradesbymatt':('partial','Channel focuses on futures and crypto rather than US single-stock picks; its Wall Street trading audience overlaps.'),
'investwithhenry':('strong','Current public videos discuss META, NVIDIA and SoFi puts and covered calls.'),
'theotrade':('strong','Current videos analyze US mega-caps, the Dow and S&P 500 alongside options education.'),
'chatwithtraderspodcast':('partial','Trading interviews cover stocks/options and US prop/pit traders, alongside forex and crypto.'),
'traderlion':('strong','Current videos teach stock swing setups and CANSLIM screens with experienced stock traders.'),
'jjbuckner':('weak','Current channel description and videos focus on personal finances, restaurants, cars and consumer debt.'),
'financialwisdom':('partial','Channel teaches swing/breakout stock strategies and links Interactive Brokers; audience residency and US-only focus are unverified.'),
'thestockguy':('partial','Channel says it trades live at market open, but recent public videos emphasize general finance and housing.'),
'optionstrat':('strong','Current videos discuss S&P stock breadth, the Fed, covered calls and advanced option hedges.'),
'optionomega':('strong','Channel explicitly focuses on SPX, SPY, 0DTE and index options, including AAPL/NVDA/TSLA backtests.'),
'vincentdesiano':('strong','Current prep videos analyze QQQ, Nasdaq and SPY price action with options education.'),
'tradingdecoded':('strong','Current channel teaches day-trading support/resistance and call/put price-action setups.'),
'optionsplay':('strong','Current videos cover tech/industrial stock sectors, options processes and US bond-market signals.'),
'stockchartstv':('strong','Public StockCharts channel teaches stock/fund selection using market technical analysis.'),
'reallifetrading':('strong','Public channel teaches stock trading and shows SPY credit-spread trading examples.'),
'figuringoutmoney':('strong','Channel explicitly offers S&P 500, Nasdaq, sector and equity chart reports with options/gamma context.'),
'carmine-rosato':('partial','Channel teaches day trading with price action and order flow; US single-stock coverage is not explicit in its description.'),
'benzinga':('strong','Public channel and advertising site address active retail stock traders and actionable stock-market coverage.'),
'tradepro':('weak','Fresh public video list is dominated by crypto/Bitcoin and altcoin setups rather than US equity trading.'),
'tradingwarzofficial':('strong','Public channel focuses on options/futures; owner newsletter explicitly discusses NVDA, AMD and SPY.'),
'traderisk':('strong','Channel teaches stock swing/system strategies; company offers stock-market research and trader campaigns.'),
'outliertrading':('strong','Current videos analyze stock options, the wheel, GME gamma and options portfolio sizing.'),
'bthetrader87':('strong','Current interviews cover US prop firms, big stock moves and a TQQQ trading strategy.'),
'rockwelltradingservices':('strong','Current videos teach stock wheel income and earnings-session option strategies.'),
'financialeducation2':('partial','Public channel discusses individual stocks and portfolio investing rather than daily trading.'),
'trendspider':('strong','Current channel videos build Micron earnings and stock day-trading strategies on its charting platform.'),
'thetravelingtrader':('strong','Channel covers stocks/options/futures and current Big Tech/AI stock opportunities.'),
'stockstotrade':('strong','Channel provides stock screening, charting, penny-stock setups and day-two watchlists.'),
'projectoption':('strong','Public options lessons cover calls/puts and explicitly link US broker tastytrade.'),
'optionswithdavis':('strong','Channel teaches systematic stock-option income strategies including the wheel and credit spreads.'),
'chartnotes':('strong','Fresh About page explicitly describes a Nasdaq-100 stock-trader macro regime model.'),
'coffeegroundstrading':('strong','Fresh About page describes a daily disclosed equity portfolio and a COHR position.'),
'dailystockpick':('strong','Fresh About page offers daily stock-selection/trade setups using TrendSpider and Seeking Alpha.'),
'denisdoroshenko':('partial','Fresh About page offers fundamental company research and momentum screens, without explicit US-only coverage.'),
'halaltrader':('partial','Fresh About page covers halal equity analysis; geography and active US-stock focus are unconfirmed.'),
'dynalogic':('strong','Fresh About page describes daily equity/ETF buy-sell signals and transparent options trades.'),
'lighthousemacro':('partial','Fresh About page connects macro/liquidity regimes to equities and FICC; audience also includes policymakers/operators.'),
'michaeljburry':('strong','Fresh About page offers company/security analysis and stock-market projections from Michael Burry.'),
'jminvestments':('partial','Fresh About page offers earnings, valuation and long-term company research rather than daily trading.'),
'marlincapital':('strong','Fresh About page describes a stock trader/investor service with NYC prop-trading experience and growth-stock research.'),
'onlyfin':('partial','Fresh About page targets busy professionals and broad investing rather than active US-stock traders.'),
'optionsoracle':('strong','Fresh About page offers daily technical trade ideas for puts, covered calls and the stock-option wheel.'),
'optionstrategist':('strong','Fresh About page offers stock-market technical indicators and options strategies by Lawrence McMillan.'),
'optionsmonitor':('partial','Fresh About page targets option income on dividend stocks and passive index portfolios; US-only focus is not established.'),
'paretoinvestor':('partial','Fresh About page targets high-conviction long-term stock selection rather than daily US trading.'),
'spotgamma':('strong','Fresh publication describes stock insights from options flows; owner site analyzes S&P 500 gamma levels.'),
'stockanalysiscompilation':('partial','Fresh About page curates stock pitches from hedge-fund letters and newsletters; trading/geographic focus is unconfirmed.'),
'tacticalallocationdesk':('partial','Fresh About page allocates UPRO, Bitcoin and gold; only part of the strategy is US-equity exposure.'),
'tanukitrade':('strong','Fresh About page explicitly addresses US-market options, earnings reports and weekly watchlists.'),
'themultiplier':('partial','Fresh About page targets retirement income from selling options rather than active daily picks.'),
'theowave':('partial','Fresh About page describes global multi-asset Elliott-wave/options execution rather than US-stock specialization.'),
'theregimereport':('weak','Fresh About page offers country/regime macro reports; no specific active US-stock trading coverage was verified.'),
'tradingwarzcpa':('strong','Fresh About page explicitly cites NVDA, AMD, SPY and LEAPS/options strategies.'),
'tradeintelligent':('weak','Fresh About page only describes generic tools/signals; no US-stock audience or examples were verified.'),
'yougotthistrading':('partial','Fresh About page mixes daily stock models and options education with Indian and European index coverage.'),
'dd8njgqweq':('strong','Live Discord invite API identifies TanukiTrade Advanced Options Hub; owner explicitly teaches US-market options.'),
'unusualwhales':('strong','Live Discord invite identifies Unusual Whales; owner publishes US equity/options-flow and stock news.'),
'gvyvjwqt9m':('weak','Live invite identifies r/Daytrading but provides no market description; US fit and business outreach permission were not established.'),
'r-options':('weak','Only a generic Reddit application shell loaded; current community content and business contact were not independently verified.'),
'r-daytrading':('weak','Only a generic Reddit application shell loaded; current community content and business contact were not independently verified.'),
'r-thetagang':('weak','Only a generic Reddit application shell loaded; current community content and business contact were not independently verified.'),
'unusual-whales':('strong','Loaded public X feed covers US stocks including AAPL, Nvidia and US equity-market news.'),
}
personal={'stockedup':'Published contact is mike@stockedup.university, a personal-looking address; no separate business-role route verified.','tradingwarzofficial':'Public site offers rich@tradingwarz.com, a personal-looking address; no separate business-role contact verified.','tradingwarzcpa':'Same owner offers rich@tradingwarz.com, a personal-looking address; no separate business-role route verified.','theotrade':'Published media address Stacie@theotrade.com is personal-looking; no separate eligible business-role route verified.'}
audit=[];kept=[]
def audience(s, fallback=0):
    labels=json.dumps(s.get('audience_labels',[]),ensure_ascii=False)
    m=re.search(r'([\d,.]+)\s*([KM]?)\s+subscribers',labels,re.I)
    return round(float(m[1].replace(',',''))*{'':1,'K':1000,'M':1000000}[m[2].upper()]) if m else fallback
for row in original:
    key=row['tracked_slug'][3:];s=source[row['tracked_slug']]
    rating,evidence=fit[key];contact=contacts.get(key)
    row={**row,'audience_size':audience(s,int(row['audience_size'])),'signups':int(row['signups']),'source_url_live':s['source_url_live'],'contact_source_url':contact[1] if contact else '', 'us_trader_fit':rating,'fit_evidence':evidence,'verified_at':s['verified_at']}
    if key=='unusual-whales':
        m=re.search(r'([\d.]+)M\s+Followers',s['content'],re.I)
        row['audience_size']=round(float(m[1])*1000000) if m else 0
    if key in ('dd8njgqweq','unusualwhales','gvyvjwqt9m'):
        code={'dd8njgqweq':'Dd8njgQwEQ','unusualwhales':'unusualwhales','gvyvjwqt9m':'gVyVJWqt9m'}[key]
        invite=by_url['https://discord.com/api/v10/invites/'+code+'?with_counts=true']
        row['audience_size']=json.loads(invite['content'])['approximate_member_count']
    reason=''
    if rating=='weak':reason='Weak/unverified US-trader fit: '+evidence
    elif not contact:reason=personal.get(key,'No publicly published business inquiry route verified on the loaded source and owner/contact pages; a generic social DM is insufficient.')
    elif row['source_url_live']!='y':reason='Source did not load as a live public page.'
    if not reason:
        row['contact']=contact[0];
        if row['platform']=='Substack': row['audience_size']=0
        kept.append(row)
    audit.append({'lead':row,'source_url':s['source_url'],'decision':'remove' if reason else 'keep','reason':reason,'contact_evidence':contact[2] if contact else ''})

new=[]
def add(name,key,s,contact,contact_source,evidence,niche='options',rating='strong',contact_evidence='Public company business/general inquiry route'):
    assert s.get('title'),(key,'missing source identity')
    assert s.get('http_status',s.get('status'))==200,(key,'source not live')
    url=s.get('source_url',s.get('url'))
    handle={'marketchameleon':'@user-dx2em5je7e','tradersfly':'@tradersflyofficial','humbledtrader':'https://www.youtube.com/channel/UCcIvNGMBSQWwo1v3n-ZRBCw','schaeffersresearch':'https://www.youtube.com/user/Schaeffers/','nyseofficial':'@NYSEofficial'}.get(key,'@'+key)
    row={'name':name,'handle':handle,'platform':'YouTube','kind':'creator','audience_size':audience(s), 'niche':niche,'us_focus':'yes' if rating=='strong' else 'mixed','contact':contact,'tracked_slug':'audit-'+key,'stage':'New','signups':0,'last_touch':'','notes':f'Source: {url}. Independently loaded and audited for the demo pass. Business contact: {contact_source}. {contact_evidence}. Audience residency is not verified; subscriber counts are rounded public display values.','source_url_live':'y','contact_source_url':contact_source,'us_trader_fit':rating,'fit_evidence':evidence,'verified_at':s['verified_at']}
    new.append(row)
    audit.append({'lead':row,'source_url':url,'decision':'backfill','reason':'','contact_evidence':contact_evidence})

focused=[
('SMB Capital','smbcapital','https://www.smbtraining.com/contact','https://www.smbtraining.com/contact','Public channel identifies a NYC equities prop firm and teaches stock/options trading.','day trading'),
('ClayTrader','claytrader','https://claytrader.com/contact/','https://claytrader.com/contact/','Public channel teaches live stock/option day trading, alongside other markets.','day trading'),
('Scanz','scanz','help@scanz.com','https://scanz.com/contact/','Public channel teaches real-time stock scanning and trading execution.','day trading'),
('Trade Ideas','tradeideas','info@trade-ideas.com','https://www.trade-ideas.com/contact/','Public channel teaches automated equity scanning and links Interactive Brokers execution.','day trading'),
('Option Alpha','optionalpha','https://optionalpha.com/contact','https://optionalpha.com/contact','Public channel demonstrates stock-option portfolios, allocations and automated trades.','options'),
('EarningsBeats','earningsbeats','https://www.earningsbeats.com/public/Contact-Us.cfm','https://www.earningsbeats.com/public/Contact-Us.cfm','Public channel explicitly helps stock traders beat the S&P 500 and analyzes US earnings.','earnings'),
('Interactive Brokers','interactivebrokers','https://www.interactivebrokers.com/en/support/institutional-sales-contacts.php','https://www.interactivebrokers.com/en/support/institutional-sales-contacts.php','US broker channel discusses stock/options tools and market risks; global/institutional reach also present.','options'),
('Seeking Alpha','seekingalpha','https://seekingalpha.com/partnership/form','https://seekingalpha.com/partnership/form','Public channel analyzes US-listed MU, INTC, Western Digital and stock Quant picks.','earnings'),
]
for name,key,c,cs,e,niche in focused:add(name,key,back_source['audit-'+key],c,cs,e,niche,'partial' if key=='interactivebrokers' else 'strong')
for name,key,url,c,cs,e in [
('Humbled Trader','humbledtrader','https://www.youtube.com/channel/UCcIvNGMBSQWwo1v3n-ZRBCw/videos?hl=en','https://www.humbledtrader.com/contact-us/','https://www.humbledtrader.com/contact-us/','Public channel teaches live stock day trading; corporate form explicitly accepts social-media sponsorship inquiries.'),
('MarketChameleon.com','marketchameleon','https://www.youtube.com/@user-dx2em5je7e/videos?hl=en','https://marketchameleon.com/Home/Contact','https://marketchameleon.com/Home/Contact','Verified official channel teaches stock-option analytics, SPY and earnings volatility.'),
('Sasha the Options Coach / TradersFly','tradersfly','https://www.youtube.com/tradersflyofficial/videos?hl=en','https://tradersfly.com/sponsorship','https://tradersfly.com/sponsorship','Official site links this channel; current videos teach stock options and portfolio income strategies.'),
("Schaeffer's Investment Research",'schaeffersresearch','https://www.youtube.com/user/Schaeffers/videos?hl=en','https://www.schaeffersresearch.com/contact-us','https://www.schaeffersresearch.com/contact-us','Official channel teaches US stock-option analysis; corporate page explicitly invites media/advertising partnerships.'),

]:add(name,key,by_url[url],c,cs,e)

additional=[
('Morningstar','morningstar','newsroom@morningstar.com','https://www.morningstar.com/en-us/company/contact-us','Public channel covers investment research and US stock/fund valuation; more investing than day trading.','partial'),
('InvestorPlace','investorplace','affiliates@investorplace.com','https://investorplace.com/corporate/advertise-with-us/','Public stock/option research publisher offers stock picks and market analysis; affiliate team publicly listed.','strong'),
('Nasdaq','nasdaq','https://www.nasdaq.com/advertising#contact-us','https://www.nasdaq.com/advertising','Public channel covers listed companies and US-market investing; exchange/media audience is broader than retail traders.','partial'),
('Yahoo Finance','yahoofinance','https://www.yahooinc.com/contact','https://www.yahooinc.com/contact','Public channel discusses US stocks, earnings, macro and investor portfolios; corporate form explicitly includes Yahoo Finance.','strong'),
('Bloomberg Television','bloombergtelevision','https://www.bloombergmedia.com/contact/','https://www.bloombergmedia.com/contact/','Public channel delivers financial-market analysis; global professional audience overlaps US traders.','partial'),
("Barron's",'barrons','eventsrsvp@dowjones.com','https://dowjonescustomevents.com/','Public channel explicitly covers Wall Street and stocks to invest in or avoid.','strong'),
('MarketWatch','marketwatch','eventsrsvp@dowjones.com','https://dowjonescustomevents.com/','Public financial/investing channel and owner site cover US markets; recent videos also cover personal finance.','partial'),
('The Wall Street Journal','wsj','eventsrsvp@dowjones.com','https://dowjonescustomevents.com/','Public channel covers US business transactions and economic news; broad news audience makes fit partial.','partial'),
('TradingView','tradingview','https://www.tradingview.com/advertising-info/','https://www.tradingview.com/advertising-info/','Public channel teaches trading/chart tools across global markets, including US stocks; broader multi-asset audience.','partial'),
('Simply Wall St','simplywallst','partnerships@simplywallst.com','https://simplywall.st/advertising','Public channel teaches company/stock analysis for retail investors; global long-term orientation makes fit partial.','partial'),
('Cboe Global Markets','cboeglobalmarkets','https://www.cboe.com/optionsinstitute/contact','https://www.cboe.com/optionsinstitute/contact','Official channel offers US options/equities education; Options Institute explicitly welcomes partnership inquiries.','strong'),
]
for name,key,c,cs,e,rating in additional:add(name,key,extra_source['audit-'+key],c,cs,e,'general investing' if rating=='partial' or key in ('barrons','investorplace') else 'options',rating)
add('CNBC Television','cnbctelevision',by_url['https://www.youtube.com/@CNBCtelevision/videos?hl=en'],'https://together.nbcuni.com/advertise/?utm_source=cnbc&utm_medium=referral&utm_campaign=property_ad_pages','https://www.cnbc.com/','Public channel delivers US stock/earnings/Fed market news; CNBC footer publicly links this advertising inquiry route.','earnings')
add('New York Stock Exchange','nyseofficial',by_url['https://www.youtube.com/@NYSEofficial/videos?hl=en'],'https://www.nyse.com/contact#media-relations','https://www.nyse.com/contact','Official exchange channel covers listed US companies and market-opening news; institutional reach makes retail-trader fit partial.','general investing','partial')

assert len(kept)==25,len(kept)
assert len(new)==25,len(new)
accepted=kept+new
assert len(accepted)==50
base=['name','handle','platform','kind','audience_size','niche','us_focus','contact','tracked_slug','stage','signups','last_touch','notes']
columns=base+['source_url_live','contact_source_url','us_trader_fit','fit_evidence','verified_at']
def write_csv(file,rows):
    with (root/'data'/file).open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=columns);w.writeheader();w.writerows(rows)
write_csv('creator-list-r1-audited-all.csv',[r['lead'] for r in audit if r['decision']!='backfill'])
write_csv('creator-list-audited.csv',accepted)
(root/'data/creator-demo-audit.json').write_text(json.dumps({'verified_at':now,'before':66,'retained':len(kept),'removed':66-len(kept),'backfilled':len(new),'after':len(accepted),'records':audit,'accepted':accepted},indent=2),encoding='utf-8')
print(f'66 original: {len(kept)} retained, {66-len(kept)} removed; {len(new)} backfilled; {len(accepted)} final.')
