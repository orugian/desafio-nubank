// Confere fidelidade ao roteiro e procura indícios de segredo sem imprimir conteúdo sensível.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const assert=require('node:assert/strict');
const roteiro=fs.readFileSync(path.join(__dirname,'..','ENSAIO-S2.md'),'utf8');const textos=[...roteiro.matchAll(/^> (.+)$/gm)].map(m=>m[1].trim());assert.equal(textos.length,20);
let respostas=0,bloqueios=0;for(let n=1;n<=20;n++){const x=JSON.parse(fs.readFileSync(path.join(__dirname,`real-turno-${String(n).padStart(2,'0')}.json`),'utf8'));assert.equal(x.mensagem,textos[n-1]);if(x.status==='bloqueado')bloqueios++;else if(x.resposta?.status==='ok')respostas++;}
const hash=crypto.createHash('sha256').update(roteiro).digest('hex');const manifesto=JSON.parse(fs.readFileSync(path.join(__dirname,'real-manifesto-B.json'),'utf8'));assert.equal(manifesto.roteiro_sha256,hash);
const padroes=[/sk-or-v1-[A-Za-z0-9_-]{16,}/, /nvapi-[A-Za-z0-9_-]{16,}/, /Bearer\s+[A-Za-z0-9_.-]{24,}/];let achados=[];let examinados=0;
for(const arq of fs.readdirSync(__dirname).filter(x=>/\.(json|ndjson|md)$/.test(x))){const conteudo=fs.readFileSync(path.join(__dirname,arq),'utf8');examinados++;if(padroes.some(re=>re.test(conteudo)))achados.push(arq);}
const r={mensagens_exatas:textos.length,respostas,bloqueios,roteiro_sha256:hash,hash_igual_ao_manifesto_retomada:true,evidencias_examinadas:examinados,arquivos_com_indicio_de_segredo:achados};
fs.writeFileSync(path.join(__dirname,'integridade.json'),JSON.stringify(r,null,2)+'\n',{encoding:'utf8',flag:'wx'});console.log(JSON.stringify(r,null,2));if(achados.length)process.exitCode=1;
