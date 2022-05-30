import {encrypt, recover} from '../src/main';

test("sample image 4x1 with n=5, k=3, TH=16", ()=>{
    const TH = 16;
    const shares = 5
    const threshold = 3
    const covers = [[0,1,0,1],[1,0,1,0],[1,0,0,0],[0,0,1,0],[0,0,0,1]]
    const secretPixels = [255, 125, 148, 200]

    const {modifiedCovers, m, T, p} = encrypt(shares, threshold, secretPixels, covers, TH)

    const {secretRecovered, coversRecovered} = recover(modifiedCovers, m, T, p, threshold);
    
    expect(secretRecovered).toEqual(secretPixels);
    expect(coversRecovered).toEqual(covers);
})