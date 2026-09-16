// 由 build/make-demo-seed.js 生成，请勿手改（改数据请改生成器再重跑）。
// 全部内容为虚构示例，不含真实实验数据。
window.CKO = window.CKO || {};
window.CKO.seedDemo = {
 "version": 1,
 "generatedAt": "2026-09-16T15:08:07.091Z",
 "project": {
  "schemaVersion": 3,
  "id": "demo-project",
  "code": "DEMO-01",
  "title": "示例项目 · 三代繁育与笼位",
  "owner": "",
  "species": "rat",
  "speciesLabel": "大鼠",
  "strain": "目标基因-Flox × Cre 驱动系（SD 大鼠）",
  "meta": {
   "goalSpec": "示例：展示父本母本溯源、世代分层、笼位分组与鉴定批次的组织方式。",
   "goal": "目标鼠 = 目标基因-KO 有带 + Cre 2 条带 + Flox 无带。",
   "goalNote": "本示例数据全部虚构，仅用于演示界面与流程，可直接删除。",
   "note": ""
  },
  "loci": [
   {
    "id": "target_flox",
    "name": "目标基因-Flox",
    "short": "Flox",
    "model": "biallelic",
    "color": "#f0883e",
    "aliases": [
     "flox",
     "floxed",
     "fl",
     "f"
    ],
    "alleles": {
     "none": "DD",
     "single": "FF",
     "double": "FD"
    },
    "labels": {
     "none": "无带",
     "single": "1 条带",
     "double": "2 条带"
    },
    "order": [
     "double",
     "single",
     "none"
    ],
    "metric": "bands",
    "defaultValue": null,
    "version": 1,
    "archived": false,
    "note": "条件性敲除的 floxed 等位。目标（敲除成立）时两个 flox 等位应被 Cre 切除 → 无带。"
   },
   {
    "id": "target_ko",
    "name": "目标基因-KO",
    "short": "KO",
    "model": "biallelic",
    "color": "#db6dc4",
    "aliases": [
     "ko",
     "knockout",
     "敲除"
    ],
    "alleles": {
     "pos": "KK",
     "neg": "WW"
    },
    "labels": {
     "pos": "有带",
     "neg": "无带"
    },
    "order": [
     "pos",
     "neg"
    ],
    "metric": "binary",
    "defaultValue": null,
    "version": 1,
    "archived": false,
    "note": "敲除等位 PCR。目标鼠应有带（KO 特异条带）。"
   },
   {
    "id": "cre",
    "name": "Cre 驱动系",
    "short": "Cre",
    "model": "transgenic",
    "color": "#3fb950",
    "aliases": [
     "cre",
     "cre-driver"
    ],
    "alleles": {
     "double": "PN",
     "single": "NN",
     "none": "XX"
    },
    "labels": {
     "double": "2 条带",
     "single": "1 条带",
     "none": "无带"
    },
    "order": [
     "double",
     "single",
     "none"
    ],
    "metric": "bands",
    "defaultValue": null,
    "version": 1,
    "archived": false,
    "note": "组织特异 Cre 驱动系。目标鼠应「2 条带」（Cre 阳性）。务必选 transgenic：双带×双带=纯合携带，仍判双带。"
   }
  ],
  "targets": [
   {
    "id": "cko",
    "name": "cKO 目标鼠",
    "color": "#3fb950",
    "rules": [
     {
      "locus": "target_ko",
      "call": "pos"
     },
     {
      "locus": "cre",
      "call": "double"
     },
     {
      "locus": "target_flox",
      "call": "none"
     }
    ],
    "note": "KO 有带 + Cre 双带 + Flox 无带（三条件同时满足即判为目标鼠）",
    "archived": false
   }
  ],
  "settings": {
   "defaultLitter": 8,
   "photoMaxSide": 1400,
   "photoQuality": 0.82,
   "backupKeep": 30
  },
  "createdAt": "2026-09-16T15:08:07.091Z",
  "updatedAt": "2026-09-16T15:08:07.091Z"
 },
 "rats": [
  {
   "id": 1,
   "tag": "101",
   "sex": "M",
   "birth": "2025-11-05",
   "litter": null,
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": null,
   "dam": null,
   "cage": "B1",
   "cageSince": "2025-11-05",
   "weaned": null,
   "note": "外部引进种鼠",
   "source": "外部引进",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-01-08",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "none",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jei9e96qv",
     "kind": "note",
     "date": "2025-11-28",
     "text": "种鼠引进并建档",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.089Z"
    },
    {
     "id": "mu48jeiaidvsh",
     "kind": "cross",
     "date": "2025-12-01",
     "text": "与 102 同笼配种（B1 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2025-11-05",
   "updatedAt": "2025-11-05"
  },
  {
   "id": 2,
   "tag": "102",
   "sex": "F",
   "birth": "2025-11-08",
   "litter": null,
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": null,
   "dam": null,
   "cage": "B1",
   "cageSince": "2025-11-08",
   "weaned": null,
   "note": "外部引进种鼠，Cre 阳性",
   "source": "外部引进",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-01-08",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeia2f1zk",
     "kind": "note",
     "date": "2025-11-28",
     "text": "种鼠引进并建档",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaca22l",
     "kind": "cross",
     "date": "2025-12-01",
     "text": "与 101 同笼配种（B1 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2025-11-08",
   "updatedAt": "2025-11-08"
  },
  {
   "id": 3,
   "tag": "103",
   "sex": "M",
   "birth": "2025-11-20",
   "litter": null,
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": null,
   "dam": null,
   "cage": "B2",
   "cageSince": "2025-11-20",
   "weaned": null,
   "note": "外部引进种鼠",
   "source": "外部引进",
   "gt": {
    "target_flox": {
     "call": "single",
     "bands": 1,
     "date": "2026-01-08",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaoaw27",
     "kind": "note",
     "date": "2025-11-28",
     "text": "种鼠引进并建档",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiapi3rb",
     "kind": "cross",
     "date": "2025-12-05",
     "text": "与 104 同笼配种（B2 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2025-11-20",
   "updatedAt": "2025-11-20"
  },
  {
   "id": 4,
   "tag": "104",
   "sex": "F",
   "birth": "2025-11-22",
   "litter": null,
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": null,
   "dam": null,
   "cage": "B2",
   "cageSince": "2025-11-22",
   "weaned": null,
   "note": "外部引进种鼠",
   "source": "外部引进",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-01-08",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "none",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiayqe06",
     "kind": "note",
     "date": "2025-11-28",
     "text": "种鼠引进并建档",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiapwdp6",
     "kind": "cross",
     "date": "2025-12-05",
     "text": "与 103 同笼配种（B2 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2025-11-22",
   "updatedAt": "2025-11-22"
  },
  {
   "id": 5,
   "tag": "201",
   "sex": "M",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "B3",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1，留种与 203 配种",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaib9hu",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 B3 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaqek6t",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiat0ypa",
     "kind": "cross",
     "date": "2026-06-10",
     "text": "与 203 同笼配种（B3 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 6,
   "tag": "202",
   "sex": "M",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "C1",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1，2026-06 复检改判",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": "2026-06-18",
     "raw": "复检：有带（原判无带）",
     "prev": "neg",
     "src": "recheck",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaia7va",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 C1 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiah7hqz",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaidpxs",
     "kind": "note",
     "date": "2026-06-18",
     "text": "复检改判：目标基因-KO 由无带改判为有带",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 7,
   "tag": "203",
   "sex": "F",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "B3",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1，留种与 201 配种",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaibf96",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 B3 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiad2mq2",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia9jd1k",
     "kind": "cross",
     "date": "2026-06-10",
     "text": "与 201 同笼配种（B3 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 8,
   "tag": "204",
   "sex": "F",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "C3",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "single",
     "bands": 1,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiascf7e",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 C3 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaqt07e",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 9,
   "tag": "205",
   "sex": "M",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "culled",
   "statusDate": "2026-04-02",
   "sire": 1,
   "dam": 2,
   "cage": "C2",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1，基因型不符，2026-04-02 淘汰",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "single",
     "bands": 1,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "none",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeia07yyc",
     "kind": "culled",
     "date": "2026-04-02",
     "text": "淘汰：目标基因-KO 无带、Flox 非无带，不符合留种要求",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiasv36r",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 C2 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeialf3p0",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 10,
   "tag": "226",
   "sex": "F",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "C3",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1，原耳号 206，耳标脱落后重编",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "single",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiagcoox",
     "kind": "note",
     "date": "2026-05-08",
     "text": "耳标脱落，原耳号 206 注销，重编为 226",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia72phv",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 C3 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiax9i7k",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 11,
   "tag": "207",
   "sex": "M",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "C1",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "single",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeia51u1e",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 C1 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiawkdfx",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 12,
   "tag": "208",
   "sex": "F",
   "birth": "2026-02-14",
   "litter": "L1",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 1,
   "dam": 2,
   "cage": "C3",
   "cageSince": "2026-03-16",
   "weaned": "2026-03-16",
   "note": "L1",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiabzpyk",
     "kind": "wean",
     "date": "2026-03-16",
     "text": "断奶并转入 C3 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia1o008",
     "kind": "birth",
     "date": "2026-02-14",
     "text": "出生（L1）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-14",
   "updatedAt": "2026-02-14"
  },
  {
   "id": 13,
   "tag": "209",
   "sex": "M",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "B4",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2，留种与 214 配种",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiazhn1a",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 B4 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiauuqk8",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiadm2tr",
     "kind": "cross",
     "date": "2026-06-12",
     "text": "与 214 同笼配种（B4 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 14,
   "tag": "210",
   "sex": "F",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "C4",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaocsmy",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 C4 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiannnv2",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 15,
   "tag": "211",
   "sex": "M",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "C2",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "single",
     "bands": 1,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeia3waww",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 C2 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia7y5f6",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 16,
   "tag": "212",
   "sex": "M",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "C2",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "none",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiazwqk0",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 C2 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiavbaj0",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 17,
   "tag": "213",
   "sex": "F",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "C4",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "single",
     "bands": 1,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "single",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaexpzn",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 C4 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaa6g1n",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 18,
   "tag": "214",
   "sex": "F",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "B4",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2，留种与 209 配种",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaivvyc",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 B4 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia8r81r",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiabj4ql",
     "kind": "cross",
     "date": "2026-06-12",
     "text": "与 209 同笼配种（B4 繁殖笼）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 19,
   "tag": "215",
   "sex": "F",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "C4",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeia56xwk",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 C4 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeianf4xs",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 20,
   "tag": "216",
   "sex": "M",
   "birth": "2026-02-16",
   "litter": "L2",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 3,
   "dam": 4,
   "cage": "C2",
   "cageSince": "2026-03-18",
   "weaned": "2026-03-18",
   "note": "L2",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-03-12",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "none",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeia52ags",
     "kind": "wean",
     "date": "2026-03-18",
     "text": "断奶并转入 C2 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiakdvpc",
     "kind": "birth",
     "date": "2026-02-16",
     "text": "出生（L2）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-02-16",
   "updatedAt": "2026-02-16"
  },
  {
   "id": 21,
   "tag": "301",
   "sex": "M",
   "birth": "2026-07-20",
   "litter": "L3",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 5,
   "dam": 7,
   "cage": "C5",
   "cageSince": "2026-08-17",
   "weaned": "2026-08-17",
   "note": "L3，已断奶",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-08-14",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiamk15d",
     "kind": "wean",
     "date": "2026-08-17",
     "text": "断奶并转入 C5 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiam0tg0",
     "kind": "birth",
     "date": "2026-07-20",
     "text": "出生（L3）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiajgccs",
     "kind": "note",
     "date": "2026-08-17",
     "text": "判为目标鼠，留养待用",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-20",
   "updatedAt": "2026-07-20"
  },
  {
   "id": 22,
   "tag": "302",
   "sex": "F",
   "birth": "2026-07-20",
   "litter": "L3",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 5,
   "dam": 7,
   "cage": "C6",
   "cageSince": "2026-08-17",
   "weaned": "2026-08-17",
   "note": "L3，已断奶",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-08-14",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiakygej",
     "kind": "wean",
     "date": "2026-08-17",
     "text": "断奶并转入 C6 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia4adva",
     "kind": "birth",
     "date": "2026-07-20",
     "text": "出生（L3）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia5ju2n",
     "kind": "note",
     "date": "2026-08-17",
     "text": "判为目标鼠，留养待用",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-20",
   "updatedAt": "2026-07-20"
  },
  {
   "id": 23,
   "tag": "303",
   "sex": "M",
   "birth": "2026-07-20",
   "litter": "L3",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 5,
   "dam": 7,
   "cage": "C5",
   "cageSince": "2026-08-17",
   "weaned": "2026-08-17",
   "note": "L3，已断奶",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-08-14",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "single",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiad597j",
     "kind": "wean",
     "date": "2026-08-17",
     "text": "断奶并转入 C5 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaizbbk",
     "kind": "birth",
     "date": "2026-07-20",
     "text": "出生（L3）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-20",
   "updatedAt": "2026-07-20"
  },
  {
   "id": 24,
   "tag": "304",
   "sex": "F",
   "birth": "2026-07-20",
   "litter": "L3",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 5,
   "dam": 7,
   "cage": "C6",
   "cageSince": "2026-08-17",
   "weaned": "2026-08-17",
   "note": "L3，已断奶",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "single",
     "bands": 1,
     "date": "2026-08-14",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiati94q",
     "kind": "wean",
     "date": "2026-08-17",
     "text": "断奶并转入 C6 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeianykw9",
     "kind": "birth",
     "date": "2026-07-20",
     "text": "出生（L3）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-20",
   "updatedAt": "2026-07-20"
  },
  {
   "id": 25,
   "tag": "305",
   "sex": "M",
   "birth": "2026-07-20",
   "litter": "L3",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 5,
   "dam": 7,
   "cage": "C5",
   "cageSince": "2026-08-17",
   "weaned": "2026-08-17",
   "note": "L3，已断奶",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "double",
     "bands": 2,
     "date": "2026-08-14",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "neg",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "none",
     "bands": 0,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiawdjrf",
     "kind": "wean",
     "date": "2026-08-17",
     "text": "断奶并转入 C5 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia40o7j",
     "kind": "birth",
     "date": "2026-07-20",
     "text": "出生（L3）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-20",
   "updatedAt": "2026-07-20"
  },
  {
   "id": 26,
   "tag": "306",
   "sex": "F",
   "birth": "2026-07-20",
   "litter": "L3",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 5,
   "dam": 7,
   "cage": "C6",
   "cageSince": "2026-08-17",
   "weaned": "2026-08-17",
   "note": "L3，已断奶",
   "source": "自繁",
   "gt": {
    "target_flox": {
     "call": "none",
     "bands": 0,
     "date": "2026-08-14",
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "target_ko": {
     "call": "pos",
     "bands": 1,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    },
    "cre": {
     "call": "double",
     "bands": 2,
     "date": null,
     "raw": null,
     "prev": null,
     "src": "stated",
     "locusVersion": 1
    }
   },
   "events": [
    {
     "id": "mu48jeiaj1xzk",
     "kind": "wean",
     "date": "2026-08-17",
     "text": "断奶并转入 C6 笼",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeiaumpxx",
     "kind": "birth",
     "date": "2026-07-20",
     "text": "出生（L3）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    },
    {
     "id": "mu48jeia69yw5",
     "kind": "note",
     "date": "2026-08-17",
     "text": "判为目标鼠，留养待用",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-20",
   "updatedAt": "2026-07-20"
  },
  {
   "id": 27,
   "tag": "307",
   "sex": "M",
   "birth": "2026-07-22",
   "litter": "L4",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 13,
   "dam": 18,
   "cage": "B4",
   "cageSince": "2026-07-22",
   "weaned": null,
   "note": "L4，未断奶、尚未剪尾鉴定",
   "source": "自繁",
   "gt": {},
   "events": [
    {
     "id": "mu48jeiaz9wue",
     "kind": "birth",
     "date": "2026-07-22",
     "text": "出生（L4）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-22",
   "updatedAt": "2026-07-22"
  },
  {
   "id": 28,
   "tag": "308",
   "sex": "F",
   "birth": "2026-07-22",
   "litter": "L4",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 13,
   "dam": 18,
   "cage": "B4",
   "cageSince": "2026-07-22",
   "weaned": null,
   "note": "L4，未断奶、尚未剪尾鉴定",
   "source": "自繁",
   "gt": {},
   "events": [
    {
     "id": "mu48jeiak2kfq",
     "kind": "birth",
     "date": "2026-07-22",
     "text": "出生（L4）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-22",
   "updatedAt": "2026-07-22"
  },
  {
   "id": 29,
   "tag": "309",
   "sex": "M",
   "birth": "2026-07-22",
   "litter": "L4",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 13,
   "dam": 18,
   "cage": "B4",
   "cageSince": "2026-07-22",
   "weaned": null,
   "note": "L4，未断奶、尚未剪尾鉴定",
   "source": "自繁",
   "gt": {},
   "events": [
    {
     "id": "mu48jeiad2366",
     "kind": "birth",
     "date": "2026-07-22",
     "text": "出生（L4）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-22",
   "updatedAt": "2026-07-22"
  },
  {
   "id": 30,
   "tag": "310",
   "sex": "F",
   "birth": "2026-07-22",
   "litter": "L4",
   "genotypeLine": null,
   "status": "alive",
   "statusDate": null,
   "sire": 13,
   "dam": 18,
   "cage": "B4",
   "cageSince": "2026-07-22",
   "weaned": null,
   "note": "L4，未断奶、尚未剪尾鉴定",
   "source": "自繁",
   "gt": {},
   "events": [
    {
     "id": "mu48jeia51vdm",
     "kind": "birth",
     "date": "2026-07-22",
     "text": "出生（L4）",
     "sessionId": null,
     "photos": [],
     "payload": {},
     "createdAt": "2026-09-16T15:08:07.090Z"
    }
   ],
   "batch": null,
   "batchSeq": null,
   "slot": null,
   "batches": [],
   "createdAt": "2026-07-22",
   "updatedAt": "2026-07-22"
  }
 ],
 "sessions": [
  {
   "id": 1,
   "seq": 1,
   "date": "2026-01-08",
   "images": [],
   "lanes": [
    {
     "idx": 1,
     "tag": "101",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "101",
     "ratId": 1
    },
    {
     "idx": 2,
     "tag": "102",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "102",
     "ratId": 2
    },
    {
     "idx": 3,
     "tag": "103",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "103",
     "ratId": 3
    },
    {
     "idx": 4,
     "tag": "104",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "104",
     "ratId": 4
    }
   ],
   "note": "种鼠引进后复检（4 只）",
   "targetId": "cko",
   "kind": "genotyping",
   "source": "manual",
   "rawStmt": "种鼠引进后复检（4 只）",
   "createdAt": "2026-09-16T15:08:07.090Z",
   "updatedAt": "2026-09-16T15:08:07.090Z"
  },
  {
   "id": 2,
   "seq": 2,
   "date": "2026-03-12",
   "images": [],
   "lanes": [
    {
     "idx": 1,
     "tag": "201",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "201",
     "ratId": 5
    },
    {
     "idx": 2,
     "tag": "202",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": "复检：有带（原判无带）",
       "src": "recheck"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "202",
     "ratId": 6
    },
    {
     "idx": 3,
     "tag": "203",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "203",
     "ratId": 7
    },
    {
     "idx": 4,
     "tag": "204",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "204",
     "ratId": 8
    },
    {
     "idx": 5,
     "tag": "205",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "205",
     "ratId": 9
    },
    {
     "idx": 6,
     "tag": "226",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "226",
     "ratId": 10
    },
    {
     "idx": 7,
     "tag": "207",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "207",
     "ratId": 11
    },
    {
     "idx": 8,
     "tag": "208",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "208",
     "ratId": 12
    },
    {
     "idx": 9,
     "tag": "209",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "209",
     "ratId": 13
    },
    {
     "idx": 10,
     "tag": "210",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "210",
     "ratId": 14
    },
    {
     "idx": 11,
     "tag": "211",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "211",
     "ratId": 15
    },
    {
     "idx": 12,
     "tag": "212",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "212",
     "ratId": 16
    },
    {
     "idx": 13,
     "tag": "213",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "213",
     "ratId": 17
    },
    {
     "idx": 14,
     "tag": "214",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "214",
     "ratId": 18
    },
    {
     "idx": 15,
     "tag": "215",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "215",
     "ratId": 19
    },
    {
     "idx": 16,
     "tag": "216",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "216",
     "ratId": 20
    }
   ],
   "note": "F1 断奶前剪尾鉴定（L1 / L2 共 16 只）",
   "targetId": "cko",
   "kind": "genotyping",
   "source": "manual",
   "rawStmt": "F1 断奶前剪尾鉴定（L1 / L2 共 16 只）",
   "createdAt": "2026-09-16T15:08:07.091Z",
   "updatedAt": "2026-09-16T15:08:07.091Z"
  },
  {
   "id": 3,
   "seq": 3,
   "date": "2026-06-18",
   "images": [],
   "lanes": [
    {
     "idx": 1,
     "tag": "202",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": "复检：有带（原判无带）",
       "src": "recheck"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "202",
     "ratId": 6
    },
    {
     "idx": 2,
     "tag": "207",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "207",
     "ratId": 11
    },
    {
     "idx": 3,
     "tag": "209",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "209",
     "ratId": 13
    },
    {
     "idx": 4,
     "tag": "210",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "210",
     "ratId": 14
    },
    {
     "idx": 5,
     "tag": "214",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "214",
     "ratId": 18
    }
   ],
   "note": "F1 复检与选种（其中 202 一例改判）",
   "targetId": "cko",
   "kind": "genotyping",
   "source": "manual",
   "rawStmt": "F1 复检与选种（其中 202 一例改判）",
   "createdAt": "2026-09-16T15:08:07.091Z",
   "updatedAt": "2026-09-16T15:08:07.091Z"
  },
  {
   "id": 4,
   "seq": 4,
   "date": "2026-08-14",
   "images": [],
   "lanes": [
    {
     "idx": 1,
     "tag": "301",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "301",
     "ratId": 21
    },
    {
     "idx": 2,
     "tag": "302",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "302",
     "ratId": 22
    },
    {
     "idx": 3,
     "tag": "303",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "303",
     "ratId": 23
    },
    {
     "idx": 4,
     "tag": "304",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "single",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "304",
     "ratId": 24
    },
    {
     "idx": 5,
     "tag": "305",
     "type": "sample",
     "sex": "雄",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "neg",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "305",
     "ratId": 25
    },
    {
     "idx": 6,
     "tag": "306",
     "type": "sample",
     "sex": "雌",
     "warn": [],
     "gts": [
      {
       "locus": "target_flox",
       "call": "none",
       "sure": true,
       "bands": 0,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "target_ko",
       "call": "pos",
       "sure": true,
       "bands": 1,
       "raw": null,
       "src": "stated"
      },
      {
       "locus": "cre",
       "call": "double",
       "sure": true,
       "bands": 2,
       "raw": null,
       "src": "stated"
      }
     ],
     "raw": "306",
     "ratId": 26
    }
   ],
   "note": "F2 剪尾鉴定（L3 共 6 只）",
   "targetId": "cko",
   "kind": "genotyping",
   "source": "manual",
   "rawStmt": "F2 剪尾鉴定（L3 共 6 只）",
   "createdAt": "2026-09-16T15:08:07.091Z",
   "updatedAt": "2026-09-16T15:08:07.091Z"
  }
 ]
};
