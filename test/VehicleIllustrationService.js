const fs = require('fs');

const paths = ['/temp/vh/img/artic/v1/Artic_front.svg',
  '/temp/vh/img/artic/v1/Artic_left.svg',
  '/temp/vh/img/artic/v1/Artic_rear.svg',
  '/temp/vh/img/artic/v1/Artic_right.svg',
  '/temp/vh/img/artic/v1/Artic_top.svg',
  '/temp/vh/img/artic/v1/Artic_trailer_front.svg',
  '/temp/vh/img/box/v1/Box_bottom.svg',
  '/temp/vh/img/box/v1/Box_front.svg',
  '/temp/vh/img/box/v1/Box_left.svg',
  '/temp/vh/img/box/v1/Box_rear.svg',
  '/temp/vh/img/box/v1/Box_right.svg',
  '/temp/vh/img/box/v1/Box_top.svg',
  '/temp/vh/img/c20/v1/C20_bottom.svg',
  '/temp/vh/img/c20/v1/C20_doorside.svg',
  '/temp/vh/img/c20/v1/C20_front.svg',
  '/temp/vh/img/c20/v1/C20_left.svg',
  '/temp/vh/img/c20/v1/C20_right.svg',
  '/temp/vh/img/c20/v1/C20_top.svg',
  '/temp/vh/img/c20/v2/C20_bottom.svg',
  '/temp/vh/img/c20/v2/C20_doorside.svg',
  '/temp/vh/img/c20/v2/C20_front.svg',
  '/temp/vh/img/c20/v2/C20_left.svg',
  '/temp/vh/img/c20/v2/C20_right.svg',
  '/temp/vh/img/c20/v2/C20_top.svg',
  '/temp/vh/img/c30/v1/C30_bottom.svg',
  '/temp/vh/img/c30/v1/C30_doorside.svg',
  '/temp/vh/img/c30/v1/C30_front.svg',
  '/temp/vh/img/c30/v1/C30_left.svg',
  '/temp/vh/img/c30/v1/C30_right.svg',
  '/temp/vh/img/c30/v1/C30_top.svg',
  '/temp/vh/img/c30/v2/C30_bottom.svg',
  '/temp/vh/img/c30/v2/C30_doorside.svg',
  '/temp/vh/img/c30/v2/C30_front.svg',
  '/temp/vh/img/c30/v2/C30_left.svg',
  '/temp/vh/img/c30/v2/C30_right.svg',
  '/temp/vh/img/c30/v2/C30_top.svg',
  '/temp/vh/img/c40/v1/C40_bottom.svg',
  '/temp/vh/img/c40/v1/C40_doorside.svg',
  '/temp/vh/img/c40/v1/C40_front.svg',
  '/temp/vh/img/c40/v1/C40_left.svg',
  '/temp/vh/img/c40/v1/C40_right.svg',
  '/temp/vh/img/c40/v1/C40_top.svg',
  '/temp/vh/img/c40/v2/C40_bottom.svg',
  '/temp/vh/img/c40/v2/C40_doorside.svg',
  '/temp/vh/img/c40/v2/C40_front.svg',
  '/temp/vh/img/c40/v2/C40_left.svg',
  '/temp/vh/img/c40/v2/C40_right.svg',
  '/temp/vh/img/c40/v2/C40_top.svg',
  '/temp/vh/img/car/v3/CAR_TEST_front.svg',
  '/temp/vh/img/car/v3/CAR_TEST_left.svg',
  '/temp/vh/img/car/v3/CAR_TEST_right.svg',
  '/temp/vh/img/car/v3/CAR_TEST_roof.svg',
  '/temp/vh/img/car/v3/CAR_TEST_van.svg',
  '/temp/vh/img/car/v4/CAR_TEST_front.svg',
  '/temp/vh/img/car/v4/CAR_TEST_left.svg',
  '/temp/vh/img/car/v4/CAR_TEST_right.svg',
  '/temp/vh/img/car/v4/CAR_TEST_roof.svg',
  '/temp/vh/img/car/v4/CAR_TEST_sedan.svg',
  '/temp/vh/img/car/v4/CAR_TEST_van.svg',
  '/temp/vh/img/caravan/v1/Caravan_front.svg',
  '/temp/vh/img/caravan/v1/Caravan_left.svg',
  '/temp/vh/img/caravan/v1/Caravan_rear.svg',
  '/temp/vh/img/caravan/v1/Caravan_right.svg',
  '/temp/vh/img/caravan/v1/Caravan_roof.svg',
  '/temp/vh/img/chassis/v1/Chassis_front_final.svg',
  '/temp/vh/img/chassis/v1/Chassis_left_final.svg',
  '/temp/vh/img/chassis/v1/Chassis_rear_final.svg',
  '/temp/vh/img/chassis/v1/Chassis_right_final.svg',
  '/temp/vh/img/chassis/v1/Chassis_top_final.svg',
  '/temp/vh/img/fridge/v1/back_fridge_final.svg',
  '/temp/vh/img/fridge/v1/front_fridge_final.svg',
  '/temp/vh/img/fridge/v1/left_fridge_final.svg',
  '/temp/vh/img/fridge/v1/right_fridge_final.svg',
  '/temp/vh/img/fridge/v1/top_fridge_final.svg',
  '/temp/vh/img/hanger/v1/Front_hanger.svg',
  '/temp/vh/img/hanger/v1/Left_hanger.svg',
  '/temp/vh/img/hanger/v1/Rear_hanger.svg',
  '/temp/vh/img/hanger/v1/Right_hanger.svg',
  '/temp/vh/img/hanger/v1/Top_hanger.svg',
  '/temp/vh/img/lorry/v1/Lorry_front.svg',
  '/temp/vh/img/lorry/v1/Lorry_left.svg',
  '/temp/vh/img/lorry/v1/Lorry_rear.svg',
  '/temp/vh/img/lorry/v1/Lorry_right.svg',
  '/temp/vh/img/lorry/v1/Lorry_top.svg',
  '/temp/vh/img/minibus/v1/Minibus_front.svg',
  '/temp/vh/img/minibus/v1/Minibus_left.svg',
  '/temp/vh/img/minibus/v1/Minibus_rear.svg',
  '/temp/vh/img/minibus/v1/Minibus_right.svg',
  '/temp/vh/img/minibus/v1/Minibus_roof.svg',
  '/temp/vh/img/road_train/v1/Road_train_back.svg',
  '/temp/vh/img/road_train/v1/Road_train_front.svg',
  '/temp/vh/img/road_train/v1/Road_train_hanger_front.svg',
  '/temp/vh/img/road_train/v1/Road_train_left.svg',
  '/temp/vh/img/road_train/v1/Road_train_lorry_back.svg',
  '/temp/vh/img/road_train/v1/Road_train_right.svg',
  '/temp/vh/img/road_train/v1/Road_train_roof.svg',
  '/temp/vh/img/trailer/v1/TR_front_final.svg',
  '/temp/vh/img/trailer/v1/TR_left_final.svg',
  '/temp/vh/img/trailer/v1/TR_rear_final.svg',
  '/temp/vh/img/trailer/v1/TR_right_final.svg',
  '/temp/vh/img/trailer/v1/TR_top_final.svg',
  '/temp/vh/img/tugmaster_lhd/v1/Tugmaster_Lhd_front.svg',
  '/temp/vh/img/tugmaster_lhd/v1/Tugmaster_Lhd_left.svg',
  '/temp/vh/img/tugmaster_lhd/v1/Tugmaster_Lhd_rear.svg',
  '/temp/vh/img/tugmaster_lhd/v1/Tugmaster_Lhd_right.svg',
  '/temp/vh/img/tugmaster_lhd/v1/Tugmaster_Lhd_roof.svg',
  '/temp/vh/img/tugmaster_lhd/v2/Tugmaster_Lhd_front.svg',
  '/temp/vh/img/tugmaster_lhd/v2/Tugmaster_Lhd_left.svg',
  '/temp/vh/img/tugmaster_lhd/v2/Tugmaster_Lhd_rear.svg',
  '/temp/vh/img/tugmaster_lhd/v2/Tugmaster_Lhd_right.svg',
  '/temp/vh/img/tugmaster_lhd/v2/Tugmaster_Lhd_roof.svg',
  '/temp/vh/img/tugmaster_rhd/v1/Tugmaster_Rhd_front.svg',
  '/temp/vh/img/tugmaster_rhd/v1/Tugmaster_Rhd_left.svg',
  '/temp/vh/img/tugmaster_rhd/v1/Tugmaster_Rhd_rear.svg',
  '/temp/vh/img/tugmaster_rhd/v1/Tugmaster_Rhd_right.svg',
  '/temp/vh/img/tugmaster_rhd/v1/Tugmaster_Rhd_roof.svg',
  '/temp/vh/img/tugmaster_rhd/v3/Tugmaster_Rhd_front.svg',
  '/temp/vh/img/tugmaster_rhd/v3/Tugmaster_Rhd_left.svg',
  '/temp/vh/img/tugmaster_rhd/v3/Tugmaster_Rhd_rear.svg',
  '/temp/vh/img/tugmaster_rhd/v3/Tugmaster_Rhd_right.svg',
  '/temp/vh/img/tugmaster_rhd/v3/Tugmaster_Rhd_roof.svg',
  '/temp/vh/img/van/v1/Van_front.svg',
  '/temp/vh/img/van/v1/Van_left.svg',
  '/temp/vh/img/van/v1/Van_rear.svg',
  '/temp/vh/img/van/v1/Van_right.svg',
  '/temp/vh/img/van/v1/Van_roof.svg'];

const typeMapping = {
  AR: 'artic',
  CC: 'artic',
  C2: 'c20',
  C3: 'c30',
  C4: 'c40',
  FT: 'fridge',
  G1: 'box',
  G2: 'box',
  HB: 'lorry',
  LO: 'lorry',
  R4: 'box',
  S1: 'box',
  S2: 'box',
  SU: 'chassis',
  T1: 'car',
  T2: 'caravan',
  T3: 'chassis',
  T5: 'minibus',
  TR: 'trailer',
  X1: 'box',
  X2: 'car',
  U1: 'car',
  U2: 'caravan',
  U3: 'chassis',
  U4: 'box', // tractorSet
  U5: 'minibus',
  VA: 'van',
  TM1: 'tugmaster_lhd',
  TM2: 'tugmaster_lhd',
  RT: 'road_train'
};

const sideKeys = {
  right: 'right',
  back: ['rear', 'sedan', 'back'],
  top: ['roof', 'top'],
  back2: '_van',
  left: 'left',
  front: 'front'
};

export default class VehicleIllustrationService {
  getIllustrationsByVehicleType(type, version, callback) {
    if (typeof version === 'function') {
      callback = version;
      version = undefined;
    }
    const fileKey = typeMapping[type] || 'box';
    const files = this._getPossibleFiles(paths, fileKey);
    const versionedFiles = this._getFilesForVersion(files, version);
    const set = this._buildMetadata(versionedFiles);
    return this._loadFiles(set, callback);
  }

  _loadFiles(set, callback) {
    let n = 0;
    const cb = () => {
      n++;
      if (n === set.metadata.sides.length) {
        callback(null, set);
      }
    };
    set.metadata.sides.forEach(side => {
      fs.readFile(set[side], 'utf-8', (err, data) => { set[side] = data; cb(); });
    });
  }

  _buildMetadata(files) {
    const set = {};
    set.metadata = { sides: [] };
    Object.keys(sideKeys).forEach(k => {
      let keys = sideKeys[k];
      if (!Array.isArray(keys)) {
        keys = [keys];
      }
      keys = keys.map(key => files.find(file => file.indexOf(key) > -1)).filter(key => key !== undefined);
      keys.forEach((key, i) => { set[k + (i > 0 ? i + 1 : '')] = key; });
      if (keys.length > 0) {
        set.metadata.sides.push(k);
      }
    });
    if (set.metadata.sides.length < 5) {
//      throw new Error('unable to find sides' + files);
    }
    return set;
  }

  _getFilesForVersion(files, version) {
    let v = version;
    if (!v) {
      // max version
      v = files.reduce((prev, curr) => Math.max(prev || 0, parseInt(/.*v(\d).*/g.exec(curr)[1], 10)));
    }
    return this._getPossibleFiles(files, 'v' + v);
  }
  _getPossibleFiles(possible, key) {
    return possible.filter(path => path.indexOf('/' + key + '/') > -1);
  }
}
