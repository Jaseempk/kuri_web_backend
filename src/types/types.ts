export interface KuriMarketDeployed {
  id: string;
  caller: string;
  marketAddress: string;
  intervalType: string;
  timestamp: string;
  wannabeMember: boolean;
  circleCurrencyAddress: string;
}

export interface KuriInitialised {
  id: string;
  _kuriData_0: string; // creator (address)
  _kuriData_1: string; // kuriAmount (uint64)
  _kuriData_2: string; // totalParticipantsCount (uint16)
  _kuriData_3: string; // totalActiveParticipantsCount (uint16)
  _kuriData_4: string; // intervalDuration (uint24)
  _kuriData_5: string; // nexRaffleTime (uint48)
  _kuriData_6: string; // nextIntervalDepositTime (uint48)
  _kuriData_7: string; // launchPeriod (uint48)
  _kuriData_8: string; // startTime (uint48)
  _kuriData_9: string; // endTime (uint48)
  _kuriData_10: string; // intervalType (enum)
  _kuriData_11: string; // state (enum)
  contractAddress: string;
}

export interface RaffleWinnerSelected {
  id: string;
  intervalIndex: string;
  winnerIndex: string;
  winnerAddress: string;
  winnerTimestamp: string;
  requestId: string;
  contractAddress: string;
}

export interface SubgraphResponse {
  kuriMarketDeployeds: KuriMarketDeployed[];
  kuriInitialiseds: KuriInitialised[];
}

export interface RaffleWinnerResponse {
  raffleWinnerSelecteds: RaffleWinnerSelected[];
}
