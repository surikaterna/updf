export const fontsRuntime = `
  const {readFileSync} = await import('node:fs');
  const input = {...JSON.parse(readFileSync('liberation-sans.json','utf8')),bytes:new Uint8Array(readFileSync('LiberationSans-Regular.ttf'))};
  const cf = require('@updf/fonts'), ef = await import('@updf/fonts');
  const ct = require('@updf/text'), et = await import('@updf/text');
  const runtime = cf.fontRuntime();
  const fontOptions = {resources:{Helvetica:ef.createHelvetica()},text:et.createTextService({runtime,defaultFont:'Helvetica'}),providers:[ef.fontProvider(runtime)]};
  for (const factory of [cf,ef]) for (const font of [factory.createHelvetica(),factory.createPreparedFont(input)]) {
    for (const loader of [cf,ef]) {
      const rt = loader.fontRuntime();
      rt.validateResource(font,'/font');
      assert.equal(cr.isOwnedResource(font),true);
      assert.equal(er.isOwnedResource(font),true);
      const fc = ev.createContext({font});
      const Reader = () => {assert.equal(cv.useContext(fc).font,font);return null;};
      cv.lower(ej.jsxDEV('document',{version:1,children:cj.jsx('page',{width:100,height:100,children:ev.h(Reader,{})})}));
      for (const service of [ct,et]) for (const provider of [cf,ef]) {
        const options = {resources:{Demo:font},text:service.createTextService({runtime:rt}),providers:[provider.fontProvider(rt)]};
        const node = {type:'text',x:0,y:0,width:90,height:12,text:'mixed',font:'Demo',fontSize:10,lineHeight:12,align:'left'};
        const definition = {version:1,pages:[{width:100,height:100,children:[node]}]};
        assert.deepEqual(c.render(definition,options),e.render(definition,options));
        const measurement = {kind:'plain',text:'mixed',font:'Demo',fontSize:10,lineHeight:12,align:'left',width:90};
        assert.deepEqual(ct.measureText(measurement,options),et.measureText(measurement,options));
        const foreign = provider.fontRuntime();
        assert.throws(()=>foreign.joinRuns([rt.measure(font,'A',10,'rich','').run],'/foreign'),e.DocumentError);
        assert.throws(()=>e.render(definition,{...options,providers:[provider.fontProvider(foreign)]}),c.DocumentError);
      }
    }
  }
`;

export const hostRuntime = `
  const ct = require('@updf/text'), et = await import('@updf/text');
  const resource = cr.createOwnedResource({host:true});
  const runtime = {
    validateResource:r=>assert.equal(er.isOwnedResource(r),true),
    validateText:()=>{},
    lineMetrics:()=>({ascent:8,descent:2}),
    fixedPolicy:()=>({baseline:'ascent',checkInk:false}),
    measure:(_r,s,size)=>({advance:s.length*size/2,left:0,right:s.length*size/2,ascent:size*.8,descent:size*.2,top:-size*.8,bottom:size*.2,empty:!s.length,run:{}}),
    joinRuns:()=>({}),
  };
  const measurement = {kind:'plain',text:'host',font:'Host',fontSize:10,lineHeight:12,align:'left',width:90};
  for (const service of [ct,et]) {
    const options = {resources:{Host:resource},text:service.createTextService({runtime})};
    assert.deepEqual(ct.measureText(measurement,options),et.measureText(measurement,options));
    assert.equal(et.measureText(measurement,options).width,90);
  }
`;
