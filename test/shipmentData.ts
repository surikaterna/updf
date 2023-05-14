export default {
  "id": "3da757d5-1e81-44af-8784-5f536ac730c5",
  "type": {
    "identifier": "shipment",
    "domain": "order",
    "authority": "lx3"
  },
  "timeIntervals": {
    "shippingDate": {
      "estimated": {
        "format": "date_time",
        "value": "2016-10-20T21:00:00.00+00:00"
      }
    },
    "deliveryDate": {
      "estimated": {
        "format": "date_time",
        "value": "2016-10-20T05:00:00.00+00:00"
      }
    }
  },
  "parties": {
    "deliveryLocation": {
      "id": "88844561-5edd-4884-9483-3f5d30427942",
      "name": "Port of BELFAST",
      "addressLine": "Belfast BT3 9AG",
      "zipOrPostalCode": "9999",
      "city": "Belfast",
      "countryCode": "GB",
      "contactMeans": [
        {
          "function": "Personal Email",
          "type": "email",
          "value": "delivery@example.org"
        }
      ],
      "contacts": [],
      "identifiers": [
        {
          "identifier": "GBBEL",
          "domain": "location",
          "authority": "united_nations"
        },
        {
          "identifier": "GBBELF1",
          "domain": "location",
          "authority": "stena"
        }
      ],
      "position": {
        "latitude": 54.618745,
        "longitude": -5.8977055
      }
    },
    "shippingLocation": {
      "id": "474b3a8e-0ba0-4bb0-ba53-5417e7c48e5b",
      "name": "Port of Heysham",
      "addressLine": "Morecambe LA3 2XE",
      "zipOrPostalCode": "9999",
      "city": "Birkenhead",
      "countryCode": "GB",
      "contactMeans": [
        {
          "function": "Personal Email",
          "type": "email",
          "value": "shipment@example.org"
        }
      ],
      "contacts": [],
      "identifiers": [
        {
          "identifier": "GBHYM",
          "domain": "location",
          "authority": "united_nations"
        },
        {
          "identifier": "GBHEYS",
          "domain": "location",
          "authority": "stena"
        }
      ],
      "position": {
        "latitude": 54.03285,
        "longitude": -2.9184725
      }
    },
    "orderInitiator": {
      "id": "92632aa0-0263-48e9-b900-e37916837959",
      "name": "Volvo AB",
      "addressLine": "n/a",
      "zipOrPostalCode": "9999",
      "city": "Belfast",
      "countryCode": "GB",
      "contactMeans": [],
      "contacts": [],
      "identifiers": [],
      "position": {
        "latitude": 54.03285,
        "longitude": -2.9184725
      }
    }
  },
  "identifiers": [
    {
      "identifier": "56081679",
      "domain": "order",
      "authority": "stena"
    },
    {
      "identifier": "checked_in",
      "domain": "operational_status",
      "authority": "stena"
    }
  ],
  "_id": "3da757d5-1e81-44af-8784-5f536ac730c5",
  "orderLines": [
    {
      "id": "a4f8b35d-55ea-4067-8269-9d2daea6a83c",
      "quantity": {},
      "productType": {
        "identifier": "condition_check",
        "domain": "order",
        "authority": "lx3"
      },
      "parties": {
        "deliveryLocation": {
          "id": "a4f8b35d-55ea-4067-8269-9d2daea6a83d",
          "name": "Port of BELFAST",
          "addressLine": "Belfast BT3 9AG",
          "zipOrPostalCode": "9999",
          "city": "Belfast",
          "countryCode": "GB",
          "contactMeans": [],
          "contacts": [],
          "identifiers": [
            {
              "identifier": "GBBEL",
              "domain": "location",
              "authority": "united_nations"
            },
            {
              "identifier": "GBBELF1",
              "domain": "location",
              "authority": "stena"
            }
          ],
          "position": {
            "latitude": 54.618745,
            "longitude": -5.8977055
          }
        },
        "shippingLocation": {
          "id": "a4f8b35d-55ea-4067-8269-9d2daea6a83e",
          "name": "Port of Heysham",
          "addressLine": "Morecambe LA3 2XE",
          "zipOrPostalCode": "9999",
          "city": "Heysham",
          "countryCode": "GB",
          "contactMeans": [],
          "contacts": [],
          "identifiers": [
            {
              "identifier": "GBHYM",
              "domain": "location",
              "authority": "united_nations"
            },
            {
              "identifier": "GBHEYS",
              "domain": "location",
              "authority": "stena"
            }
          ],
          "position": {
            "latitude": 54.03285,
            "longitude": -2.9184725
          }
        }
      },
      "status": "new",
      "timeIntervals": {
        "shippingDate": {
          "estimated": {
            "format": "date_time",
            "value": "2016-10-20T21:00:00.00+00:00"
          }
        },
        "deliveryDate": {
          "estimated": {
            "format": "date_time",
            "value": "2016-10-20T05:00:00.00+00:00"
          }
        }
      },
      "unitPrice": {
        "amount": 0,
        "currency": {
          "name": "SEK"
        }
      },
      "productInstance": {
        "id": "a4f8b35d-55ea-4067-8269-9d2daea6a831",
        "productIdentifier": {
          "identifier": "a2b63d83-2851-4659-bdf2-675a7ca3967e",
          "domain": "consignment",
          "authority": "lx3"
        }
      }
    }
  ],
  "consignments": [
    {
      "id": "a2b63d83-2851-4659-bdf2-675a7ca3967e"
    }
  ],
  "createDateTime": 1494355822436,
  "changeDateTime": 1494355823223,
  "version": 1,
  "consignment": {
    "id": "a2b63d83-2851-4659-bdf2-675a7ca3967e",
    "identifiers": [],
    "type": {
      "identifier": "bulk",
      "domain": "article",
      "authority": "lx3"
    },
    "parties": {
      "deliveryLocation": {
        "id": "88844561-5edd-4884-9483-3f5d30427942",
        "name": "Port of BELFAST",
        "addressLine": "Belfast BT3 9AG",
        "zipOrPostalCode": "9999",
        "city": "Belfast",
        "countryCode": "GB",
        "contactMeans": [],
        "contacts": [],
        "identifiers": [
          {
            "identifier": "GBBEL",
            "domain": "location",
            "authority": "united_nations"
          },
          {
            "identifier": "GBBELF1",
            "domain": "location",
            "authority": "stena"
          }
        ],
        "position": {
          "latitude": 54.618745,
          "longitude": -5.8977055
        }
      },
      "shippingLocation": {
        "id": "474b3a8e-0ba0-4bb0-ba53-5417e7c48e5b",
        "name": "Port of Heysham",
        "addressLine": "Morecambe LA3 2XE",
        "zipOrPostalCode": "9999",
        "city": "Heysham",
        "countryCode": "GB",
        "contactMeans": [],
        "contacts": [],
        "identifiers": [
          {
            "identifier": "GBHYM",
            "domain": "location",
            "authority": "united_nations"
          },
          {
            "identifier": "GBHEYS",
            "domain": "location",
            "authority": "stena"
          }
        ],
        "position": {
          "latitude": 54.03285,
          "longitude": -2.9184725
        }
      }
    },
    "loadingEquipments": [
      {
        "id": "6b3c4d9e-d78b-432d-a148-f054323fd671",
        "description": "Volvo FH16",
        "identifiers": [
          {
            "identifier": "ABC 123",
            "domain": "reg",
            "authority": "sae"
          },
          {
            "identifier": "2GNFLFEK2E6274871",
            "domain": "vin",
            "authority": "sae"
          }
        ],
        "equipmentType": {
          "identifier": "FT",
          "domain": "equipment_type",
          "authority": "stena"
        },
        "quantity": {
          "amount": 1,
          "unit": {
            "name": "pieces"
          }
        },
        "dimensions": {
          "outer": {
            "height": {
              "amount": 1.8,
              "unit": {
                "name": "m"
              }
            },
            "width": {
              "amount": 2.6,
              "unit": {
                "name": "m"
              }
            },
            "length": {
              "amount": 4,
              "unit": {
                "name": "m"
              }
            }
          }
        },
        "measurements": {
          "gross_weight": {
            "value": {
              "amount": 6500,
              "unit": {
                "name": "kg"
              }
            }
          }
        }
      }
    ]
  }
};