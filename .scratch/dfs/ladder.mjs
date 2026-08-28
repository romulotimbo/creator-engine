const vals = [10,70,90,480,590,880,1000,1300,1600,90500,110000,135000,165000,201000,301000]
const u = [...new Set(vals)].sort((a,b)=>a-b)
console.log("valores distintos observados:", u.join(", "))
console.log("\nrazao entre degraus consecutivos:")
for (let i=1;i<u.length;i++) {
  const r = u[i]/u[i-1]
  console.log(`  ${String(u[i-1]).padStart(7)} -> ${String(u[i]).padStart(7)}  = ${r.toFixed(3)}${r>1.4?"  (provavel salto de +1 degrau)":""}`)
}
// testa ladder geometrica de razao 10^(1/12) ~ 1.2115 (serie E12)
const r12 = Math.pow(10,1/12)
console.log(`\n10^(1/12) = ${r12.toFixed(4)}`)
console.log("\nencaixe na escala E12 (mantissa normalizada):")
for (const v of u) {
  const e = Math.floor(Math.log10(v))
  const m = v/Math.pow(10,e)
  const step = Math.log(m)/Math.log(r12)
  console.log(`  ${String(v).padStart(7)}  mantissa ${m.toFixed(3)}  degrau ${step.toFixed(2)}  ${Math.abs(step-Math.round(step))<0.06?"OK":"fora"}`)
}
