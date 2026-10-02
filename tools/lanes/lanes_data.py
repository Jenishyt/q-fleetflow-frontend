"""Curated sea-lane graph for the Q-FORGE map.

Nodes are open-water waypoints (lon, lat). Edges are straight segments
between waypoints that must NOT cross land (checked by validate_lanes.py
against Natural Earth 50m land). Canal edges are flagged and exempt.

This is an APPROXIMATION of the main commercial lanes, hand-authored.
It is not AIS-derived and not for navigation.
"""

# name: (lon, lat)
NODES = {
    # ---- Bay of Bengal / India east coast
    "CHE_A": (80.65, 13.05), "VTZ_A": (83.55, 17.60), "PBD_A": (86.95, 20.10),
    "CTG_A": (91.75, 21.85), "TUT_A": (78.35, 8.70),
    "BOB_1": (82.5, 11.5), "BOB_2": (86.0, 9.0), "BOB_3": (91.5, 6.4),
    "BOB_4": (84.5, 5.9), "BOB_5": (89.5, 6.0), "BOB_N": (87.0, 17.0), "BOB_N2": (89.5, 19.5),
    "BOB_6": (84.0, 14.5),
    # ---- Sri Lanka / south India
    "SL_E": (82.4, 8.0), "SL_SE": (81.8, 5.6), "SL_S": (80.5, 5.25), "SL_SW": (79.4, 5.9),
    "CMB_A": (79.6, 6.9), "IN_SW": (77.4, 7.2), "IN_W1": (75.7, 8.8), "COK_A": (75.85, 9.9),
    "IN_W2": (72.3, 13.0), "IN_W3": (72.2, 17.5), "BOM_A": (72.55, 18.85),
    # ---- Arabian Sea / Gulf of Oman / Gulf
    "ARB_1": (66.0, 20.5), "ARB_2": (60.6, 23.0), "ARB_3": (62.0, 15.5), "ARB_4": (57.0, 13.0),
    "ARB_5": (68.2, 21.6), "OMN_1": (57.4, 25.2), "HOR_1": (56.6, 26.55),
    "GLF_1": (55.4, 26.1), "JEA_A": (54.95, 25.35), "FJR_A": (56.55, 25.1),
    "SLL_A": (54.05, 16.5), "ARB_6": (65.0, 10.5),
    # ---- Gulf of Aden / Red Sea / Suez
    "GOA_1": (52.6, 12.3), "GOA_2": (48.0, 12.2), "GOA_3": (44.8, 12.1), "BAM": (43.35, 12.6),
    "JIB_A": (43.2, 11.75), "RS_1": (42.0, 14.4), "RS_2": (39.9, 18.0), "RS_3": (37.4, 21.8),
    "JED_A": (38.9, 21.45), "RS_4": (35.2, 26.0), "RS_5": (33.7, 27.9), "SUEZ_S": (32.58, 29.88),
    "SUEZ_N": (32.32, 31.28), "PSD_A": (32.42, 31.55),
    # ---- Malacca / Singapore / SCS
    "MAL_1": (96.2, 6.3), "MAL_2": (98.0, 5.6), "MAL_3": (99.4, 4.2), "MAL_4": (100.7, 2.9),
    "PKG_A": (101.1, 2.95), "MAL_5": (102.3, 1.85), "MAL_6": (103.4, 1.15), "SIN_A": (103.8, 1.17),
    "SIN_E": (104.6, 1.3), "SCS_1": (105.9, 2.3), "SCS_2": (108.8, 6.5), "SCS_3": (110.8, 11.5),
    "SCS_4": (113.2, 16.5), "SCS_5": (115.5, 20.0), "HKG_A": (114.1, 21.95), "SCS_6": (106.4, 4.5),
    "SCS_7": (103.7, 8.4), "SCS_8": (101.8, 9.9), "LCH_A": (100.9, 13.0), "GOT_1": (100.7, 12.3),
    "TPE_1": (118.5, 22.2), "KHH_A": (120.1, 22.5), "TWS_1": (119.3, 23.8), "TWS_2": (120.6, 25.4),
    "ECS_1": (122.6, 28.0), "SHA_A": (122.8, 30.7),
    "ECS_2": (126.3, 31.0), "KRS_1": (128.4, 33.4), "PUS_A": (129.3, 34.9),
    "ECS_3": (129.4, 29.4), "PAC_1": (133.0, 31.0), "PAC_2": (137.5, 33.2), "TYO_A": (139.8, 35.1),
    # ---- Trans-Pacific (lons canonical -180..180)
    "PAC_3": (142.0, 34.0), "PAC_4": (152.0, 38.5), "PAC_5": (166.0, 44.0), "PAC_6": (180.0, 47.0),
    "PAC_7": (-165.0, 47.0), "PAC_8": (-150.0, 43.5), "PAC_9": (-134.0, 37.5), "PAC_10": (-122.0, 33.2),
    "LAX_A": (-118.25, 33.55),
    # ---- Med
    "MED_1": (29.8, 33.2), "MED_2": (24.4, 34.35), "MED_3": (21.0, 35.6), "MED_4": (15.4, 35.6),
    "MED_5": (11.4, 37.7), "MED_6": (8.3, 38.2), "MED_7": (2.5, 38.4), "MED_8": (-1.4, 36.5),
    "GIB": (-5.5, 35.98), "PIR_A": (23.6, 37.6), "GOA_G": (8.9, 44.05), "MED_9": (7.5, 42.6),
    "MED_10": (6.0, 39.3), "VLC_A": (0.15, 39.3), "MED_11": (0.9, 38.7), "ALG_A": (-5.35, 36.0),
    "MED_12": (-3.5, 36.2),
    # ---- Atlantic / Europe
    "ATL_1": (-7.5, 36.0), "ATL_2": (-10.6, 36.8), "ATL_3": (-10.5, 43.2), "ATL_4": (-6.0, 48.4),
    "CHN_1": (-2.5, 49.7), "CHN_2": (0.5, 50.1), "CHN_3": (1.6, 51.1), "NSEA_1": (2.8, 51.7),
    "RTM_A": (3.6, 52.0), "ANR_A": (3.3, 51.55), "NSEA_2": (4.5, 53.6), "NSEA_3": (7.6, 54.3),
    "HAM_A": (8.2, 54.0), "ATL_5": (-18.0, 42.0), "ATL_6": (-35.0, 44.0), "ATL_7": (-55.0, 41.0),
    "NYC_A": (-73.6, 40.2), "ATL_8": (-65.0, 40.2),
    # ---- West Africa / South Atlantic / Santos
    "WAF_1": (-18.5, 28.0), "CAN_N": (-13.0, 32.0), "CAN_W": (-18.8, 28.8), "WAF_2": (-18.5, 14.8), "WAF_3": (-17.0, 8.0), "WAF_4": (-3.0, 3.5),
    "WAF_5": (5.0, 1.5), "WAF_6": (6.5, -3.5), "WAF_7": (9.0, -8.5), "WAF_8": (11.0, -15.0),
    "WAF_9": (12.0, -23.0), "WAF_10": (14.0, -29.0), "WAF_11": (16.0, -33.0), "CPT_A": (18.2, -33.9),
    "CPE": (17.6, -34.6), "AGU": (19.8, -35.5), "SAF_1": (24.0, -35.6), "SAF_2": (28.0, -33.9),
    "DUR_A": (31.4, -29.9), "SAF_3": (32.3, -28.8),
    "SAT_1": (-5.0, -30.0), "SAT_2": (-30.0, -28.0), "BRZ_1": (-38.5, -24.0),
    "SSZ_A": (-46.1, -24.3), "BRZ_2": (-34.0, -14.0), "BRZ_3": (-33.0, -5.5), "SAT_3": (-25.0, 5.0),
    "SAT_4": (-27.0, 13.5),
    # ---- East Africa
    "MOZ_1": (36.6, -25.0), "MOZ_2": (41.0, -20.0), "MOZ_3": (42.2, -15.0), "MOZ_4": (41.6, -10.5),
    "MBA_A": (40.0, -4.1), "MBA_B": (41.0, -4.4), "SOM_1": (44.0, -1.8), "SOM_2": (51.5, 6.0),
    "SOM_3": (53.0, 10.8), "EAF_1": (40.6, -7.0),
    "SOC_S": (55.5, 11.2), "GS_1": (33.45, 28.05), "GS_2": (32.9, 29.0), "GS_3": (32.6, 29.6),
    "ANT": (23.2, 35.65), "PIR_1": (23.9, 36.45), "PIR_2": (23.7, 37.15), "TKB": (139.7, 34.8), "BOSO_S": (140.3, 34.5),
    "TKY_1": (139.0, 34.1), "WAF_3B": (-13.5, 5.0), "WAF_3C": (-8.0, 3.6),
    "IO_1": (38.0, -34.5), "IO_2": (60.0, -26.0), "IO_3": (78.0, -12.0), "IO_4": (90.0, -2.0),
    # ---- Indian Ocean south (Fremantle etc. omitted)
}

# (a, b) open-water lane edges; third element "canal" marks canal edges.
EDGES = [
    # BoB east
    ("CHE_A", "BOB_1"), ("BOB_1", "BOB_2"), ("BOB_2", "BOB_3"), ("BOB_3", "MAL_1"),
    ("CHE_A", "VTZ_A"), ("VTZ_A", "PBD_A"), ("PBD_A", "BOB_N2"), ("BOB_N2", "CTG_A"),
    ("CHE_A", "BOB_6"), ("BOB_6", "BOB_N"), ("BOB_N", "PBD_A"), ("VTZ_A", "BOB_N"),
    ("BOB_1", "SL_E"), ("SL_E", "SL_SE"), ("SL_SE", "SL_S"), ("SL_S", "SL_SW"), ("SL_SW", "CMB_A"),
    ("CMB_A", "IN_SW"), ("SL_SE", "BOB_4"), ("BOB_4", "BOB_5"), ("BOB_5", "BOB_3"), ("SL_E", "BOB_2"),
    ("TUT_A", "IN_SW"), ("TUT_A", "SL_S"),
    ("IN_SW", "IN_W1"), ("IN_W1", "COK_A"), ("COK_A", "IN_W2"), ("IN_W2", "IN_W3"), ("IN_W3", "BOM_A"),
    ("IN_SW", "SL_SW"),
    # Arabian Sea
    ("BOM_A", "ARB_1"), ("ARB_1", "ARB_2"), ("ARB_2", "OMN_1"), ("OMN_1", "HOR_1"), ("HOR_1", "GLF_1"),
    ("GLF_1", "JEA_A"), ("OMN_1", "FJR_A"), ("FJR_A", "HOR_1"),
    ("BOM_A", "ARB_5"), ("ARB_5", "ARB_1"),
    ("SL_SW", "ARB_6"), ("ARB_6", "ARB_3"), ("ARB_3", "ARB_4"), ("ARB_4", "SOC_S"), ("SOC_S", "GOA_1"), ("ARB_3", "ARB_1"),
    ("ARB_4", "SLL_A"), ("SLL_A", "ARB_3"), ("ARB_6", "IN_W2"), ("IN_W2", "ARB_3"), ("ARB_2", "ARB_3"),
    ("ARB_6", "SL_SW"),
    # Gulf of Aden / Red Sea / Suez
    ("GOA_1", "GOA_2"), ("GOA_2", "GOA_3"), ("GOA_3", "BAM"), ("GOA_3", "JIB_A"), 
    ("BAM", "RS_1"), ("RS_1", "RS_2"), ("RS_2", "RS_3"), ("RS_3", "JED_A"), ("RS_3", "RS_4"),
    ("JED_A", "RS_2"), ("RS_4", "RS_5"), ("RS_5", "GS_1"), ("GS_1", "GS_2"), ("GS_2", "GS_3"), ("GS_3", "SUEZ_S"),
    ("SUEZ_S", "SUEZ_N", "canal"), ("SUEZ_N", "PSD_A"),
    # Malacca / SCS
    ("MAL_1", "MAL_2"), ("MAL_2", "MAL_3"), ("MAL_3", "MAL_4"), ("MAL_4", "PKG_A"), ("MAL_4", "MAL_5"),
    ("MAL_5", "MAL_6"), ("MAL_6", "SIN_A"), ("SIN_A", "SIN_E"), ("SIN_E", "SCS_1"),
    ("SCS_1", "SCS_2"), ("SCS_2", "SCS_3"), ("SCS_3", "SCS_4"), ("SCS_4", "SCS_5"), ("SCS_5", "HKG_A"),
    ("SCS_5", "TPE_1"), ("TPE_1", "KHH_A"), ("TPE_1", "TWS_1"), ("KHH_A", "TWS_1"), ("TWS_1", "TWS_2"),
    ("TWS_2", "ECS_1"), ("ECS_1", "SHA_A"), ("HKG_A", "TPE_1"),
    ("SCS_1", "SCS_6"), ("SCS_6", "SCS_7"), ("SCS_7", "SCS_8"), ("SCS_8", "GOT_1"), ("GOT_1", "LCH_A"),
    ("SHA_A", "ECS_2"), ("ECS_2", "KRS_1"), ("KRS_1", "PUS_A"),
    ("ECS_1", "ECS_3"), ("SHA_A", "ECS_3"), ("ECS_3", "PAC_1"), ("PAC_1", "PAC_2"), ("PAC_2", "TKY_1"), ("TKY_1", "TKB"), ("TKB", "TYO_A"),
    ("KRS_1", "ECS_3"),
    # Pacific
    ("PAC_2", "BOSO_S"), ("TKB", "BOSO_S"), ("BOSO_S", "PAC_3"), ("PAC_3", "PAC_4"), ("PAC_4", "PAC_5"), ("PAC_5", "PAC_6"),
    ("PAC_6", "PAC_7"), ("PAC_7", "PAC_8"), ("PAC_8", "PAC_9"), ("PAC_9", "PAC_10"), ("PAC_10", "LAX_A"),
    # Med
    ("PSD_A", "MED_1"), ("MED_1", "MED_2"), ("MED_2", "MED_3"), ("MED_3", "MED_4"), ("MED_4", "MED_5"),
    ("MED_5", "MED_6"), ("MED_6", "MED_7"), ("MED_7", "MED_8"), ("MED_8", "MED_12"), ("MED_12", "ALG_A"),
    ("MED_12", "GIB"), ("ALG_A", "GIB"), ("GIB", "ATL_1"),
    ("MED_2", "ANT"), ("ANT", "PIR_1"), ("PIR_1", "PIR_2"), ("PIR_2", "PIR_A"), ("MED_6", "MED_10"), ("MED_10", "MED_9"), ("MED_9", "GOA_G"),
    ("MED_10", "MED_7"), ("MED_7", "MED_11"), ("MED_11", "VLC_A"),
    # Atlantic / Europe
    ("ATL_1", "ATL_2"), ("ATL_2", "ATL_3"), ("ATL_3", "ATL_4"), ("ATL_4", "CHN_1"), ("CHN_1", "CHN_2"),
    ("CHN_2", "CHN_3"), ("CHN_3", "NSEA_1"), ("NSEA_1", "RTM_A"), ("NSEA_1", "ANR_A"),
    ("RTM_A", "NSEA_2"), ("NSEA_2", "NSEA_3"), ("NSEA_3", "HAM_A"),
    ("ATL_4", "ATL_5"), ("ATL_5", "ATL_6"), ("ATL_6", "ATL_7"), ("ATL_7", "ATL_8"), ("ATL_8", "NYC_A"),
    ("ATL_3", "ATL_5"),
    # West Africa / S. Atlantic
    ("ATL_2", "CAN_N"), ("CAN_N", "CAN_W"), ("CAN_W", "WAF_1"), ("WAF_1", "WAF_2"), ("WAF_2", "WAF_3"), ("WAF_3", "WAF_3B"), ("WAF_3B", "WAF_3C"), ("WAF_3C", "WAF_4"), ("WAF_4", "WAF_5"),
    ("WAF_5", "WAF_6"), ("WAF_6", "WAF_7"), ("WAF_7", "WAF_8"), ("WAF_8", "WAF_9"), ("WAF_9", "WAF_10"),
    ("WAF_10", "WAF_11"), ("WAF_11", "CPT_A"), ("WAF_11", "CPE"), ("CPT_A", "CPE"), ("CPE", "AGU"),
    ("AGU", "SAF_1"), ("SAF_1", "SAF_2"), ("SAF_2", "DUR_A"), ("DUR_A", "SAF_3"),
    ("WAF_2", "SAT_4"), ("SAT_4", "SAT_3"), ("SAT_3", "BRZ_3"), ("BRZ_3", "BRZ_2"), ("BRZ_2", "BRZ_1"),
    ("BRZ_1", "SSZ_A"), ("AGU", "SAT_1"), ("SAT_1", "SAT_2"), ("SAT_2", "BRZ_1"), ("CPE", "SAT_1"),
    ("WAF_5", "SAT_3"),
    # East Africa
    ("SAF_3", "MOZ_1"), ("MOZ_1", "MOZ_2"), ("MOZ_2", "MOZ_3"), ("MOZ_3", "MOZ_4"), ("MOZ_4", "EAF_1"),
    ("EAF_1", "MBA_B"), ("MBA_B", "MBA_A"), ("MBA_B", "SOM_1"), ("SOM_1", "SOM_2"), ("SOM_2", "SOM_3"),
    ("SOM_3", "GOA_1"), ("SOM_3", "ARB_4"),
    # Indian Ocean crossings (Cape route to Asia)
    ("AGU", "IO_1"), ("SAF_2", "IO_1"), ("IO_1", "IO_2"), ("IO_2", "IO_3"), ("IO_3", "IO_4"), ("IO_4", "BOB_5"),
    ("IO_3", "SL_S"), ("IO_2", "ARB_6"),
    ("SL_SW", "SOM_2"), ("MAL_1", "BOB_5"),
]

# port locode -> approach node
PORT_APPROACH = {
    "INMAA": "CHE_A", "INBOM": "BOM_A", "INNSA": "BOM_A", "INCOK": "COK_A",
    "INTUT": "TUT_A", "INVTZ": "VTZ_A", "INPBD": "PBD_A", "BDCGP": "CTG_A", "LKCMB": "CMB_A",
    "SGSIN": "SIN_A", "MYPKG": "PKG_A", "THLCH": "LCH_A", "HKHKG": "HKG_A", "TWKHH": "KHH_A",
    "CNSHA": "SHA_A", "KRPUS": "PUS_A", "JPTYO": "TYO_A", "AEJEA": "JEA_A", "AEFJR": "FJR_A",
    "OMSLL": "SLL_A", "SAJED": "JED_A", "DJJIB": "JIB_A", "EGPSD": "PSD_A", "GRPIR": "PIR_A",
    "ITGOA": "GOA_G", "ESALG": "ALG_A", "ESVLC": "VLC_A", "NLRTM": "RTM_A", "BEANR": "ANR_A",
    "DEHAM": "HAM_A", "ZADUR": "DUR_A", "ZACPT": "CPT_A", "KEMBA": "MBA_A", "USLAX": "LAX_A",
    "BRSSZ": "SSZ_A", "USNYC": "NYC_A", "INTUT": "TUT_A",
}
