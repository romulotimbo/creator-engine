#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src")
const imp = 'import { apiUrl } from "@/lib/api-url"\n'

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(name)) out.push(p)
  }
  return out
}

for (const f of walk(root)) {
  let s = fs.readFileSync(f, "utf8")
  if (!s.includes("apiUrl(") || s.includes('from "@/lib/api-url"')) continue
  if (s.startsWith('"use client"')) {
    s = s.replace(/^("use client"\n\n?)/, `$1${imp}`)
  } else {
    s = s.replace(/^(import .+\n)/, `$1${imp}`)
  }
  fs.writeFileSync(f, s)
  console.log("import added", path.relative(root, f))
}
