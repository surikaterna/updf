export const fragmentationRuntime = `
const {createFragmentOperation} = await import('@updf/layout-boxes/fragmentation');
const content = {};
const op = createFragmentOperation({next: (_, {offset}, work) => {work.consume(1);return {end:offset+1,height:1,content};}});
const source = {id:'a',path:'/a',descriptor:{},extent:3,mode:'splittable',width:{mode:'reflow'}};
const cursor = op.start({count:1,at:()=>source});
const one = op.fragment(cursor,{id:'one',width:5,height:1,usedHeight:0});
assert.equal(one.status,'region-full');
const two = op.fragment(one.cursor,{id:'two',width:8,height:2,usedHeight:0});
assert.equal(two.status,'done');
assert.equal(two.placements[0].start,1);
assert.equal(two.placements[0].width,8);
assert.equal(two.placements[0].units[0].content,content);
assert.equal(Object.isFrozen(content),false);
assert.equal(op.counts().measurements,4);
op.close();
`;
