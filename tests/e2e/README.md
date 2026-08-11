# End-to-end tests

**Owner: DEMO.**

These run against a **deployed** URL, not localhost, because the submission is judged on the deployed
demo. One assertion file per scenario `D1`-`D7`.

The single assertion that matters most:

```
D2: POST /api/gw/request -> premium-report
    expect status 402
    expect body.onChain.signed === false
    expect body.onChain.txHash === null
```

That is the product thesis expressed as a test.
