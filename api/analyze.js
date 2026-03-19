export default async function handler(req, res) {
  const key = process.env.OPENROUTER_KEY;
  
  return res.status(200).json({ 
    keyFound: !!key,
    keyStart: key ? key.slice(0, 10) : "NOT FOUND",
    allEnvKeys: Object.keys(process.env).filter(k => !k.includes('npm'))
  });
}
```

Commit → wait 30 sec → then open this in browser:
```
https://rx-scan-ljwsq9bgz-aliaffanpharma-8802s-projects.vercel.app/api/analyze
