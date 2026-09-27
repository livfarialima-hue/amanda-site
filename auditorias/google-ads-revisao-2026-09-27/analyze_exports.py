from pathlib import Path
import csv,io,json,re,sys,collections,hashlib,zipfile
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(r'C:\Users\danie\Downloads')
OUT=Path(__file__).parent
def read(name):
 p=ROOT/name;b=p.read_bytes();enc='utf-16' if b[:2] in (b'\xff\xfe',b'\xfe\xff') else 'utf-8-sig';s=b.decode(enc);title,period,rest=s.split('\n',2);sep='\t' if '\t' in rest.split('\n',1)[0] else ','
 return list(csv.DictReader(io.StringIO(rest),delimiter=sep)),{'file':name,'period':period.strip(),'sha256':hashlib.sha256(b).hexdigest()}
def num(x):
 try:return float(str(x).strip().replace('R$','').replace('%','').replace('\xa0','').replace('.','').replace(',','.'))
 except:return 0.
def cleanrows(rs):return [r for r in rs if not any(str(v).startswith('Total:') for v in r.values())]
names=['Relatório de campanha.csv','Relatório de configurações da campanha.csv','Relatório do grupo de anúncios.csv','Relatório de palavras-chave da rede de pesquisa.csv','Relatório de termos de pesquisa.csv','Relatório de palavras-chave negativas.csv','Relatório de locais.csv','Relatório de dispositivos.csv','Relatório de programação de anúncios diário e por hora.csv','Relatório de anúncios.csv','Relatório de associação de recursos.csv','Relatório de páginas de destino.csv','Relatório de informações do leilão.csv','Relatórios do histórico de alterações.csv']
data={};inventory=[]
for name in names:
 rs,meta=read(name);data[name]=rs;meta['rows']=len(rs);meta['columns']=list(rs[0]) if rs else [];inventory.append(meta)
def metric(r,key):return num(r.get(key,''))
terms=cleanrows(data[names[4]])
def top(rs,keys,n=20):
 return [{k:r.get(k) for k in keys} for r in sorted(rs,key=lambda r:metric(r,'Custo'),reverse=True)[:n]]
summary={'inventory':inventory,'campaigns':top(cleanrows(data[names[0]]),['Campanha','Orçamento','Interações','Custo','Resultados','Conversões (modelo atual)'],20),'groups':top(cleanrows(data[names[2]]),['Campanha','Grupo de anúncios','Cliques','Custo','Conversões'],30),'terms_top':top(terms,['Termo de pesquisa','Campanha','Grupo de anúncios','Palavra-chave','Cliques','Custo','Conversões'],45),'negative_export':data[names[5]],'auction':data[names[12]]}
patterns={'nao_cirurgico':r'endom?olift|endolifting|sem cirurgia|enzimat|enzima|hifu|ultraformer|em casa|caseir|adesivo','gratuidade':r'\bsus\b|gr[aá]tis|gratuit|gratuidade|popular','ensino':r'curso|faculdade|residencia|residência|vagas|sal[aá]rio','nao_ofertado':r'lobuloplastia|lobulo|lóbulo|otomodela'}
summary['candidate_terms']={k:top([r for r in terms if re.search(p,r['Termo de pesquisa'],re.I)],['Termo de pesquisa','Campanha','Grupo de anúncios','Palavra-chave','Adicionada/excluída','Cliques','Custo','Conversões'],30) for k,p in patterns.items()}
summary['term_coverage']={}
for c in set(r.get('Campanha') for r in terms):
 rs=[r for r in terms if r.get('Campanha')==c];summary['term_coverage'][c]={'rows':len(rs),'cost':round(sum(metric(r,'Custo') for r in rs),2),'clicks':sum(metric(r,'Cliques') for r in rs)}
history=data[names[13]]
summary['recent_changes']=[{'date':r['Data e hora'],'campaign':r['Campanha'],'group':r['Grupo de anúncios'],'changes':r['Alterações']} for r in history if any(f'{d} de set. de 2026' in r['Data e hora'] for d in range(12,28))]
with zipfile.ZipFile(ROOT/'brand_performance_report.zip') as z:summary['brand_zip']={n:z.read(n).decode('utf-8-sig',errors='replace')[:1800] for n in z.namelist()}
(OUT/'EXPORTACOES.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in ['inventory','recent_changes']},ensure_ascii=False,indent=2))
