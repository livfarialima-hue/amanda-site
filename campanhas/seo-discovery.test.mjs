import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {medicalIdentityGraph,SITE_ORIGIN,PROFILE_URL} from '../scripts/seo-identity.mjs';
const root=resolve(import.meta.dirname,'..');
const read=f=>readFileSync(resolve(root,f),'utf8');
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'=["\']([^"\']*)["\']','i'))?.[1];
const unescape=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<');
const urls=[...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const pages=urls.map(url=>{const path=new URL(url).pathname;const file=path==='/'?'index.html':path.slice(1)+'index.html';const html=read(file);const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)];return{url,file,html,nodes:scripts.flatMap(m=>{const x=JSON.parse(m[1]);return x['@graph']||[x];})};});

test('every public page identifies the same real doctor, clinic and website in static HTML',()=>{
 assert.equal(pages.length,54);
 for(const {file,nodes,html} of pages){
  for(const entity of medicalIdentityGraph()){
   const matches=nodes.filter(n=>n['@id']===entity['@id']);assert.equal(matches.length,1,file+' unique entity');assert.deepEqual(matches[0],entity,file+' identity');
  }
  assert.ok(html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0].includes('href="/dra-amanda-schroeder/"'),file+' visible profile link');
  const person=nodes.find(n=>n['@type']==='Person');assert.equal(person.medicalSpecialty,undefined);assert.equal(person.openingHoursSpecification,undefined);
  const clinic=nodes.find(n=>n['@type']==='MedicalClinic');assert.equal(clinic.openingHoursSpecification,undefined);assert.match(clinic.address.streetAddress,/conjunto 710/);
  assert.ok(existsSync(resolve(root,new URL(person.image).pathname.slice(1))),file+' real doctor image');assert.ok(existsSync(resolve(root,new URL(clinic.image).pathname.slice(1))),file+' real clinic image');
 }
});

test('page descriptions, identities and breadcrumb targets agree with canonical content',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const {file,html,nodes,url} of pages){
  const title=unescape(html.match(/<title>(.*?)<\/title>/s)[1]);const desc=unescape(attr([...html.matchAll(/<meta\b[^>]*>/g)].find(m=>attr(m[0],'name')==='description')[0],'content'));
  assert.ok(title.trim()&&desc.trim(),file);assert.ok(!titles.has(title),file+' duplicate title');assert.ok(!descriptions.has(desc),file+' duplicate description');titles.add(title);descriptions.add(desc);
  const main=nodes.find(n=>[n['@type']].flat().some(t=>['MedicalWebPage','WebPage','Article','CollectionPage','ProfilePage'].includes(t)));
  assert.ok(main,file+' main page');assert.equal(main.url,url,file);assert.equal(main.name,title,file);assert.equal(main.description,desc,file);assert.equal(main.isPartOf['@id'],SITE_ORIGIN+'/#website',file);
  if(file!=='index.html'){
   const breadcrumb=nodes.find(n=>n['@type']==='BreadcrumbList');assert.equal(main.breadcrumb['@id'],breadcrumb['@id'],file);
   assert.equal(breadcrumb.itemListElement.at(-1).item,url,file);assert.ok(breadcrumb.itemListElement.every((n,i)=>n.position===i+1&&urls.includes(n.item)),file);
  }
 }
});

test('profile page presents verifiable qualifications without fabricated review, award or rating',()=>{
 const page=pages.find(p=>p.url===PROFILE_URL);assert.ok(page);
 const profile=page.nodes.find(n=>n['@type']==='ProfilePage');assert.equal(profile.mainEntity['@id'],SITE_ORIGIN+'/#physician');
 for(const term of ['UNICAMP','Cirurgia Geral','Cirurgia Plástica','Einstein','CRM-SP 191605','RQE 110472','conjunto 710','busca-medicos'])assert.ok(page.html.includes(term),term);
 assert.doesNotMatch(page.html,/aggregateRating|reviewRating|melhor cirurgiã|risco zero|resultado garantido/i);
});

test('technical SEO does not invent clinical review or authorship for pending educational articles',()=>{
 // Ten articles are explicitly pending review in the canonical release records.
 for(const slug of ['seguranca-cirurgia-plastica','papada-contorno-cervical','cuidados-cicatrizacao-cirurgia','como-escolher-cirurgiao-plastico','recuperacao-blefaroplastia','minilifting-lifting-facial-deep-plane','como-se-preparar-cirurgia-plastica','recuperacao-lifting-cervical','otomodelacao-ou-otoplastia','lip-lifting-ou-preenchimento-labial']){
  const page=pages.find(p=>p.file===`conteudos/${slug}/index.html`);const article=page.nodes.find(n=>[n['@type']].flat().includes('Article'));
  assert.ok(article,slug);assert.equal(article.author,undefined,slug);assert.equal(article.reviewedBy,undefined,slug);assert.equal(article.lastReviewed,undefined,slug);
 }
 for(const {file,nodes} of pages)for(const n of nodes)for(const field of ['author','reviewedBy'])if(n[field])assert.deepEqual(n[field],{'@id':SITE_ORIGIN+'/#physician'},file+' consistent existing attribution');
});

test('search bots can discover content without changing the separate training policy',()=>{
 const robots=read('robots.txt');assert.match(robots,/User-agent: OAI-SearchBot\s+Allow: \//);assert.match(robots,/User-agent: GPTBot\s+Allow: \//);assert.match(robots,/User-agent: \*\s+Allow: \//);assert.ok(robots.includes(SITE_ORIGIN+'/sitemap.xml'));
});

test('the enhanced footer preserves the institutional link after JavaScript runs',()=>{
 const source=read('campanhas/site-enhancements.js');
 const code=source.slice(source.indexOf('  function installDetailedFooterMap()'),source.indexOf("  document.addEventListener('DOMContentLoaded'"));
 const navigation={dataset:{},innerHTML:'',setAttribute(){},classList:{remove(){}},querySelector(){return null;}};
 runInNewContext(code+';installDetailedFooterMap();',{document:{querySelector:()=>navigation}});
 assert.ok(navigation.innerHTML.includes('href="/dra-amanda-schroeder/"'));
 assert.ok(navigation.innerHTML.includes('href="/conteudos/"'));
 assert.equal(navigation.dataset.sitemapEnhanced,'true');
 for(const {file,html} of pages)if(html.includes('site-enhancements.js'))assert.match(html,/site-enhancements\.js\?v=20260912-seo-profile-1/,file+' cache revision');
});

test('only enumerated static alias pages redirect; functions and index.html remain outside forced rules',()=>{
 const rules=read('_redirects').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#')).map(l=>l.trim().split(/\s+/));
 const alias=rules.filter(([from])=>from.startsWith('https://inspiring-sprite-b35ca4.netlify.app/'));
 assert.equal(alias.length,urls.length);
 for(const [from,to,status] of alias){assert.equal(new URL(from).pathname,new URL(to).pathname);assert.equal(status,'301!');assert.ok(urls.includes(to));}
 assert.ok(rules.every(([from])=>!from.includes('*')&&!from.includes('/.netlify/')&&!from.endsWith('index.html')));
 assert.ok(rules.some(([from,to,status])=>from==='/conteudos/instagram/'&&to==='/conteudos/'&&status==='301'));
});
