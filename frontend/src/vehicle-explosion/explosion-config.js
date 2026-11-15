
export const EXPLOSION_CONFIG = Object.freeze({
  sedan: {
    strategy: 'legacy-sedan',
    report: 'Sedan_components.json',
    parts: []
  },

  'urus-performante': {
    strategy: 'named-parts',
    report: 'Lamborghini_Urus_Performante_components.json',
    parts: [
      'Badge_Geo_lodA',
      'Base_Geo_lodA',
      'Carbon1M_Geo_lodA',
      'Carbon1_Geo_lodA',
      'Coloured_Geo_lodA',
      'Engine_Geo_lodA',
      'Interior_Geo_lodA',
      'Window_Geo_lodA',
      'WindowInside_Geo_lodA',
      'Light_Geo_lodA',
      'LightEmissive_Geo_lodA',
      'Grille1_Geo_lodA',
      'Grille2_Geo_lodA',
      'Grille3_Geo_lodA',
      'Grille4_Geo_lodA',
      'Grille5_Geo_lodA',
      'Grille6_Geo_lodA',
      'Grille7_Geo_lodA',
      'Grille8_Geo_lodA',
      'ManufacturerPlate_Geo_lodA',
      'SeatBelt_Geo_lodA',
      'Combined_Wheels_3D_'
    ]
  },

  'ford-f150-raptor': {
    strategy: 'named-parts',
    report: 'Ford_F_150_Raptor_components.json',
    parts: [
      'engine_new',
      'chassis_2',
      'bodyshell1_1',
      'door_dside_f_28',
      'door_pside_f_23',
      'door_dside_r_31',
      'door_pside_r_26',
      'bumper_f_20',
      'boot_21',
      'bonnet_22',
      'steeringwheel_35',
      'suspension_36',
      '[wheel_59',
      '[wheel_l_58',
      '[wheel_lf]_49',
      'tow_hitch_54',
      'headlight_l_37',
      'headlight_r_38',
      'taillight_l_44',
      'taillight_r_43',
      'brakelight_l_41',
      'brakelight_r_42'
    ]
  },

  'lamborghini-centenario': {
    strategy: 'named-parts',
    report: 'Lamborghini_Centenario_components.json',
    parts: [
      '<Wheel_0',
      '<Wheel.001_1',
      '<Wheel.003_2',
      'Interior_6',
      'CR_27',
      'Seats_9',
      'Left_Door002_15',
      'Left_Door001_19',
      'Display_5',
      'moteur_11',
      'CR001_12',
      'CR002_17',
      'KLM001_13',
      'KLM003_18',
      'SDC_28',
      'DF_29',
      '012_30'
    ]
  },

  'polestar-3': {
    strategy: 'named-parts',
    report: 'Polestar_3_components.json',
    parts: [
      'ANCHOR_Door_FrontRight',
      'ANCHOR_Door_FrontLeft',
      'ANCHOR_Door_RearRight',
      'ANCHOR_Door_RearLeft',
      'ANCHOR_Boot',
      'ANCHOR_Wheel1',
      'trim_dual-motor_my27_polestar3_body',
      'trim_dual-motor_my27_polestar3_boot',
      'trim_dual-motor_my27_polestar3_bodypaint',
      'black_windshield001_LRexterior',
      'plasticD_undercarriage_LRexterior'
    ]
  },

  'skoda-elroq': {
    strategy: 'named-parts',
    report: 'Skoda_Elroq_components.json',
    parts: [
      'NEW_door_left_Front',
      'NEW_door_right_Front',
      'NEW_door_left_Rear',
      'NEW_door_right_Rear'
    ]
  },

  'bmw-s1000rr': {
    strategy: 'named-parts',
    report: 'BMW_S1000_RR_components.json',
    parts: [
      'wheel_lf.child_78',
      'wheel_lr.child_79'
    ]
  },

  'honda-cbr650r': {
    strategy: 'inspect-only',
    report: 'Honda_CBR650R_components.json',
    parts: []
  },

  'kawasaki-ninja-h2': {
    strategy: 'named-parts',
    report: 'Kawasaki_Ninja_H2_components.json',
    parts: [
      'Mesh_0153.rip_3',
      'Mesh_0162.rip_5',
      'Mesh_0023.rip_7',
      'Mesh_0126.rip_9',
      'Mesh_0016.rip_11',
      'Mesh_0119.rip_13',
      'Mesh_0039.rip_15'
    ]
  },

  'sports-bike': {
    strategy: 'named-parts',
    report: 'Sports_Bike_components.json',
    parts: [
      'Bike_Frame',
      'Suspension',
      'Wheels',
      'Traction',
      'Gearshift',
      'Handlebar',
      'Chain',
      'Brakes',
      'Brake_Lever',
      'Bike.068'
    ]
  },

  'airbus-a320': {
    strategy: 'inspect-only',
    report: 'Airbus_A320_components.json',
    parts: []
  },

  'boeing-787': {
    strategy: 'inspect-only',
    report: 'Boeing_787_components.json',
    parts: []
  },

  'sukhoi-su57': {
    strategy: 'named-parts',
    report: 'Sukhoi_Su_57_components.json',
    parts: [
      'SU57-airframe_0',
      'SU57-canopy_1',
      'SU57-cockpit_2',
      'SU57-hud_3',
      'SU57-instrGlass_4',
      'SU57-landingOff_5',
      'SU57-landingOn_6',
      'SU57-landingOnLight_7'
    ]
  },

  'apache-ah64e': {
    strategy: 'inspect-only',
    report: 'AH_64E_Apache_Guardian_components.json',
    parts: []
  },

  'realistic-helicopter': {
    strategy: 'inspect-only',
    report: 'Realistic_Helicopter_components.json',
    parts: []
  },

  'man-tgx': {
    strategy: 'inspect-only',
    report: 'MAN_TGX_2010_V8_components.json',
    parts: []
  }
});

export function getExplosionConfig(vehicleId) {
  return EXPLOSION_CONFIG[vehicleId] ?? {
    strategy: 'inspect-only',
    report: null,
    parts: []
  };
}
