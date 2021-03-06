import Big from "big.js"

const mVars = [233, 239, 241, 247, 251, 253, 254, 255]

function checkSizes(secretSize, coverSize){
    if (secretSize !== coverSize && 4*secretSize !== coverSize){
        throw new Error("Size of secret image and on of the cover images are not matched")
    }
}

function MRandomize(num){
    const mVars = [233, 239, 241, 247, 251, 253, 254, 255]
    return mVars.slice(-num).sort((a,b)=>0.5-Math.random());
}

function CalcConsts(sharesNum, threshold, m){
    const p = 131;

    let M = Big(1)

    const m_thresh = m.slice(-threshold)
    m_thresh.forEach((mi) => M = M.times(mi))
    let N = Big(1)

    for (let i = 1; i < threshold; i++) {
        N = N.times(m[sharesNum-i])  
    }

    
    const T = M.div(p).minus(1).round(undefined, Big.roundDown).div(2).round()

    return [T, M, N, p];

}

function CalcY(x, T, leftBound, difference, p){
    if (x>=0 && x<p){
        const A = difference.times(Math.random()).round().plus(leftBound)
        return A.times(p).plus(x)
    }
    else {
        const A = T.times(Math.random()).round()
        return A.times(p).plus(x).minus(p)
    }
    
}

function q (ai, THi0, THi1, ci){
    if(ci==1 && ai>=THi1){
        return true
    }
    if (ci ==0 && ai<THi0){
        return true
    }
    return false
}


export function encrypt(sharesNum, threshold, secretPixels, covers, TH=16){
    covers.forEach((cover)=>{
        checkSizes(secretPixels.length, cover.length);
    })
    
    let m = MRandomize(sharesNum)

    const [T, M, N, p] = CalcConsts(sharesNum, threshold, m);

    m = m.slice(-sharesNum)
    

    if (M.lt(N.times(p))){
        throw new Error('Step 1 requirement is not passed please pick other (k,n values)');
    }
    
    const modifiedCovers = [[],[],[],[],[]]
    secretPixels.forEach((x, sindex)=>{
        let qcond = false;

        const rightBound = M.div(p).minus(1).round(undefined, Big.roundDown)
        const leftBound = T.plus(1)
        const difference = rightBound.minus(leftBound)

        let y = 0;
        while(!qcond){
            const qcondarr = []
            y = CalcY(x, T, leftBound, difference, p);

            m.forEach((mi, index) => {      
                const THi0 = mi/2 - TH 
                const THi1 = mi/2 + TH
                const ai = y.mod(mi)
                qcondarr.push(q(ai, THi0, THi1, covers[index][sindex]))
            })
            if (!qcondarr.includes(false)){
                qcond = true
            }
        }
        m.forEach((mi, index) => {
            modifiedCovers[index][sindex] = y.mod(mi)
        })
        
    })
    
    const modCovers =  modifiedCovers.map((cover)=>{
        return cover.map((c)=>parseInt(c.toString()))
    })
    return {modifiedCovers: modCovers, m, T, p}
}

function inverse(a, n){
    let t = new Big(0);     
    let newt = new Big(1);
    let r = new Big(n);     
    let newr = new Big(a);

    while (!newr.eq(0)){
        let quotient = r.div(newr).round(undefined, Big.roundDown);
        let temp = newt;
        newt = t.minus(quotient.times(newt));
        t = temp;
        temp = newr;
        newr = r.minus(quotient.times(newr));
        r = temp;
    }
    if (r.gt(1))
        return "is not inversible"
    if (t.lt(0)) 
        t = t.plus(n)
    return t
}

function CRTSolver(CRT){
    let _M = Big(1);
    CRT.forEach((eq)=>{
        _M = _M.times(eq.mi)
    })
    CRT = CRT.map((eq)=>{
        const Mi = _M.div(eq.mi)
        return {...eq, Mi, MiInv: inverse(Mi, eq.mi)}
    })  
    let y = Big(0);
    CRT.forEach((eq)=>{
        y = y.plus(eq.ai.times(eq.Mi).times(eq.MiInv)).mod(_M)
    })
    return y.mod(_M);
}

export function recover(modifiedCovers, m, T, p, threshold){
    const coversRecovered = [];
    for (let i = 0; i < modifiedCovers.length; i++) {
        coversRecovered.push([]);
    }
    // reconstructing covers
    modifiedCovers.forEach((mc, mcindex)=>{
        const binThreshold = m[mcindex]/2
        mc.forEach((mcp, mcpindex)=>{
            coversRecovered[mcindex][mcpindex] = mcp >= binThreshold ? 1 : 0
        })
    })
    // reconstructing secret
    
    const secretLen = modifiedCovers[0].length
    const secretRecovered = []
    const modifiedThresh = modifiedCovers.slice(0, threshold);
    for (let i=0; i < secretLen; i++){
        let CRT = []
        modifiedThresh.forEach((mCov, index)=>{
            CRT.push({ai: Big(mCov[i]), mi: m[index]})
        })
        
        const y = CRTSolver(CRT)

        const _T = y.div(p).round(undefined, Big.roundDown)
        let x = 0;
        if (_T.gte(T)){
            x = y.mod(p)
        }
        else {
            x = y.mod(p).plus(p)
        }
        secretRecovered.push(x)
    }
    return {secretRecovered: secretRecovered.map(s=>parseInt(s.toString())), coversRecovered}
}
