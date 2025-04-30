export interface KuriMarketDeployed {
  id: string;
  caller: string;
  marketAddress: string;
  intervalType: string;
  timestamp: string;
  blockTimestamp: string;
}

export interface KuriInitialised {
  id: string;
  _kuriData_creator: string;
  _kuriData_kuriAmount: string;
  _kuriData_totalParticipantsCount: string;
  _kuriData_totalActiveParticipantsCount: string;
  _kuriData_intervalDuration: string;
  _kuriData_nexRaffleTime: string;
  _kuriData_nextIntervalDepositTime: string;
  _kuriData_launchPeriod: string;
  _kuriData_startTime: string;
  _kuriData_endTime: string;
  _kuriData_intervalType: string;
  _kuriData_state: string;
}

export interface SubgraphResponse {
  kuriMarketDeployeds: KuriMarketDeployed[];
  kuriInitialiseds: KuriInitialised[];
}
