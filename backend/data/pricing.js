// Pricing data extracted from CSV (shared between frontend and backend)
const pricingData = {
  // 1 day pricing
  "1 Day": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 79,
      "Day Batch (7:00 AM - 10:00 PM)": 99,
      "24 Hours Batch": 149
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 149,
      "Day Batch (7:00 AM - 10:00 PM)": 199,
      "24 Hours Batch": 299
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 149,
      "Day Batch (7:00 AM - 10:00 PM)": 199,
      "24 Hours Batch": 299
    }
  },
  
  // 8 days pricing
  "8 Days": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 299,
      "Day Batch (7:00 AM - 10:00 PM)": 399,
      "24 Hours Batch": 599
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 349,
      "Day Batch (7:00 AM - 10:00 PM)": 499,
      "24 Hours Batch": 699
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 349,
      "Day Batch (7:00 AM - 10:00 PM)": 499,
      "24 Hours Batch": 699
    }
  },
  
  // 15 days pricing
  "15 Days": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 599,
      "Day Batch (7:00 AM - 10:00 PM)": 699,
      "24 Hours Batch": 999
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 849,
      "Day Batch (7:00 AM - 10:00 PM)": 1199,
      "24 Hours Batch": 1699
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 849,
      "Day Batch (7:00 AM - 10:00 PM)": 1199,
      "24 Hours Batch": 1699
    }
  },
  
  // 1 month pricing
  "1 Month": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 999,
      "Day Batch (7:00 AM - 10:00 PM)": 1299,
      "24 Hours Batch": 1899
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 1399,
      "Day Batch (7:00 AM - 10:00 PM)": 1999,
      "24 Hours Batch": 2999
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 1699,
      "Day Batch (7:00 AM - 10:00 PM)": 2499,
      "24 Hours Batch": 3699
    }
  },
  
  // 2 months pricing
  "2 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 1999,
      "Day Batch (7:00 AM - 10:00 PM)": 2599,
      "24 Hours Batch": 3799
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 2799,
      "Day Batch (7:00 AM - 10:00 PM)": 3999,
      "24 Hours Batch": 5999
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 3399,
      "Day Batch (7:00 AM - 10:00 PM)": 4999,
      "24 Hours Batch": 7399
    }
  },
  
  // 3 months pricing
  "3 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 2849,
      "Day Batch (7:00 AM - 10:00 PM)": 3704,
      "24 Hours Batch": 5419
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 3989,
      "Day Batch (7:00 AM - 10:00 PM)": 5699,
      "24 Hours Batch": 8549
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 4849,
      "Day Batch (7:00 AM - 10:00 PM)": 7124,
      "24 Hours Batch": 10549
    }
  },
  
  // 4 months pricing
  "4 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 3999,
      "Day Batch (7:00 AM - 10:00 PM)": 5199,
      "24 Hours Batch": 7599
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 5599,
      "Day Batch (7:00 AM - 10:00 PM)": 7999,
      "24 Hours Batch": 11999
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 6799,
      "Day Batch (7:00 AM - 10:00 PM)": 9999,
      "24 Hours Batch": 14799
    }
  },
  
  // 5 months pricing
  "5 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 4999,
      "Day Batch (7:00 AM - 10:00 PM)": 6499,
      "24 Hours Batch": 9499
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 6999,
      "Day Batch (7:00 AM - 10:00 PM)": 9999,
      "24 Hours Batch": 14999
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 8499,
      "Day Batch (7:00 AM - 10:00 PM)": 12499,
      "24 Hours Batch": 18499
    }
  },
  
  // 6 months pricing
  "6 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 5639,
      "Day Batch (7:00 AM - 10:00 PM)": 7329,
      "24 Hours Batch": 10719
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 7889,
      "Day Batch (7:00 AM - 10:00 PM)": 11279,
      "24 Hours Batch": 16909
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 9589,
      "Day Batch (7:00 AM - 10:00 PM)": 14099,
      "24 Hours Batch": 20879
    }
  },
  
  // 7 months pricing
  "7 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 6999,
      "Day Batch (7:00 AM - 10:00 PM)": 9099,
      "24 Hours Batch": 13299
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 9799,
      "Day Batch (7:00 AM - 10:00 PM)": 13999,
      "24 Hours Batch": 20999
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 11899,
      "Day Batch (7:00 AM - 10:00 PM)": 17499,
      "24 Hours Batch": 25899
    }
  },
  
  // 8 months pricing
  "8 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 7999,
      "Day Batch (7:00 AM - 10:00 PM)": 10399,
      "24 Hours Batch": 15199
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 11199,
      "Day Batch (7:00 AM - 10:00 PM)": 15999,
      "24 Hours Batch": 23999
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 13599,
      "Day Batch (7:00 AM - 10:00 PM)": 19999,
      "24 Hours Batch": 29599
    }
  },
  
  // 9 months pricing
  "9 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 8369,
      "Day Batch (7:00 AM - 10:00 PM)": 10879,
      "24 Hours Batch": 15919
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 11709,
      "Day Batch (7:00 AM - 10:00 PM)": 16739,
      "24 Hours Batch": 25109
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 14229,
      "Day Batch (7:00 AM - 10:00 PM)": 20929,
      "24 Hours Batch": 30979
    }
  },
  
  // 10 months pricing
  "10 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 9199,
      "Day Batch (7:00 AM - 10:00 PM)": 11959,
      "24 Hours Batch": 17479
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 12879,
      "Day Batch (7:00 AM - 10:00 PM)": 18399,
      "24 Hours Batch": 27599
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 15639,
      "Day Batch (7:00 AM - 10:00 PM)": 22999,
      "24 Hours Batch": 34039
    }
  },
  
  // 11 months pricing
  "11 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 9899,
      "Day Batch (7:00 AM - 10:00 PM)": 12869,
      "24 Hours Batch": 18809
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 13859,
      "Day Batch (7:00 AM - 10:00 PM)": 19799,
      "24 Hours Batch": 29699
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 16829,
      "Day Batch (7:00 AM - 10:00 PM)": 24749,
      "24 Hours Batch": 36619
    }
  },
  
  // 12 months pricing
  "12 Months": {
    "Dyandhara Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 10199,
      "Day Batch (7:00 AM - 10:00 PM)": 13259,
      "24 Hours Batch": 19379
    },
    "Dyanpurn Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 14279,
      "Day Batch (7:00 AM - 10:00 PM)": 20399,
      "24 Hours Batch": 30599
    },
    "Dyanasmi Kaksh": {
      "Night Batch (10:00 PM - 7:00 AM)": 17339,
      "Day Batch (7:00 AM - 10:00 PM)": 25499,
      "24 Hours Batch": 37739
    }
  }
};

module.exports = { pricingData };