export const KuriCoreABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_kuriAmount",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "_participantCount",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "_initialiser",
        type: "address",
        internalType: "address",
      },
      {
        name: "_kuriAdmin",
        type: "address",
        internalType: "address",
      },
      {
        name: "_vrfSubscriber",
        type: "address",
        internalType: "address",
      },
      {
        name: "_intervalType",
        type: "uint8",
        internalType: "enum KuriCore.IntervalType",
      },
      {
        name: "_wannabeMember",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "_circleCurrency",
        type: "address",
        internalType: "address",
      },
      {
        name: "_vrfcoordinator",
        type: "address",
        internalType: "address",
      },
      {
        name: "_treasuryAddress",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "acceptMultipleUserMembershipRequests",
    inputs: [
      {
        name: "_users",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptUserMembershipRequest",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "activeIndices",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addSubId",
    inputs: [
      {
        name: "_newSubscriptionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "circleCurrency",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimKuriAmount",
    inputs: [
      {
        name: "_intervalIndex",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimedKuriSlot",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "depositToBeefyVault",
    inputs: [
      {
        name: "_intervalIndex",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "_beefyZapRouter",
        type: "address",
        internalType: "address",
      },
      {
        name: "_newOrder",
        type: "tuple",
        internalType: "struct IBeefyZapRouter.Order",
        components: [
          {
            name: "inputs",
            type: "tuple[]",
            internalType: "struct IBeefyZapRouter.Input[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "outputs",
            type: "tuple[]",
            internalType: "struct IBeefyZapRouter.Output[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "minOutputAmount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "relay",
            type: "tuple",
            internalType: "struct IBeefyZapRouter.Relay",
            components: [
              {
                name: "target",
                type: "address",
                internalType: "address",
              },
              {
                name: "value",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "data",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "user",
            type: "address",
            internalType: "address",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
        ],
      },
      {
        name: "_newStep",
        type: "tuple[]",
        internalType: "struct IBeefyZapRouter.Step[]",
        components: [
          {
            name: "target",
            type: "address",
            internalType: "address",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "tokens",
            type: "tuple[]",
            internalType: "struct IBeefyZapRouter.StepToken[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "index",
                type: "int32",
                internalType: "int32",
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "flagUser",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
      {
        name: "_intervalIndex",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getActiveIndicesLength",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleAdmin",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "grantRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasClaimed",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasPaid",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
      {
        name: "_intervalIndex",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasWon",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initialiseKuri",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "intervalToWinnerIndex",
    inputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "kuriData",
    inputs: [],
    outputs: [
      {
        name: "creator",
        type: "address",
        internalType: "address",
      },
      {
        name: "kuriAmount",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "totalParticipantsCount",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "totalActiveParticipantsCount",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "intervalDuration",
        type: "uint24",
        internalType: "uint24",
      },
      {
        name: "nexRaffleTime",
        type: "uint48",
        internalType: "uint48",
      },
      {
        name: "nextIntervalDepositTime",
        type: "uint48",
        internalType: "uint48",
      },
      {
        name: "launchPeriod",
        type: "uint48",
        internalType: "uint48",
      },
      {
        name: "startTime",
        type: "uint48",
        internalType: "uint48",
      },
      {
        name: "endTime",
        type: "uint48",
        internalType: "uint48",
      },
      {
        name: "intervalType",
        type: "uint8",
        internalType: "enum KuriCore.IntervalType",
      },
      {
        name: "state",
        type: "uint8",
        internalType: "enum KuriCore.KuriState",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "kuriNarukk",
    inputs: [],
    outputs: [
      {
        name: "_requestId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "passedIntervalsCounter",
    inputs: [],
    outputs: [
      {
        name: "numTotalDepositIntervalsPassed",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "payments",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rawFulfillRandomWords",
    inputs: [
      {
        name: "requestId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "randomWords",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rejectUserMembershipRequest",
    inputs: [
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "callerConfirmation",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestMembership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeInitialisor",
    inputs: [
      {
        name: "_initialiser",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "s_callbackGasLimit",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "s_keyHash",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "s_numWords",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "s_requestConfirmations",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "s_subscriptionId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "s_vrfCoordinator",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IVRFCoordinatorV2Plus",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setCoordinator",
    inputs: [
      {
        name: "_vrfCoordinator",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setInitialisor",
    inputs: [
      {
        name: "_initialiser",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "userBeefyPosition",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "vaultAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "shareAmount",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "originalAmount",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "timestamp",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "intervalIndex",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "isActive",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userIdToAddress",
    inputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userInstallmentDeposit",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "userToData",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "userState",
        type: "uint8",
        internalType: "enum KuriCore.UserState",
      },
      {
        name: "userIndex",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "userAddress",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vrfCoordinator",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawFromBeefyVault",
    inputs: [
      {
        name: "_beefyZapRouter",
        type: "address",
        internalType: "address",
      },
      {
        name: "_newOrder",
        type: "tuple",
        internalType: "struct IBeefyZapRouter.Order",
        components: [
          {
            name: "inputs",
            type: "tuple[]",
            internalType: "struct IBeefyZapRouter.Input[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "outputs",
            type: "tuple[]",
            internalType: "struct IBeefyZapRouter.Output[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "minOutputAmount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "relay",
            type: "tuple",
            internalType: "struct IBeefyZapRouter.Relay",
            components: [
              {
                name: "target",
                type: "address",
                internalType: "address",
              },
              {
                name: "value",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "data",
                type: "bytes",
                internalType: "bytes",
              },
            ],
          },
          {
            name: "user",
            type: "address",
            internalType: "address",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
        ],
      },
      {
        name: "_newStep",
        type: "tuple[]",
        internalType: "struct IBeefyZapRouter.Step[]",
        components: [
          {
            name: "target",
            type: "address",
            internalType: "address",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "tokens",
            type: "tuple[]",
            internalType: "struct IBeefyZapRouter.StepToken[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "index",
                type: "int32",
                internalType: "int32",
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "wonKuriSlot",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BeefyVaultDeposit",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "intervalIndex",
        type: "uint16",
        indexed: true,
        internalType: "uint16",
      },
      {
        name: "vaultAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "shareAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "kuriAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BeefyVaultWithdraw",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "vaultAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "shareAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "withdrawAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CoordinatorSet",
    inputs: [
      {
        name: "vrfCoordinator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "KuriInitFailed",
    inputs: [
      {
        name: "creator",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "kuriAmount",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "totalParticipantsCount",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
      {
        name: "state",
        type: "uint8",
        indexed: false,
        internalType: "enum KuriCore.KuriState",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "KuriInitialised",
    inputs: [
      {
        name: "_kuriData",
        type: "tuple",
        indexed: false,
        internalType: "struct KuriCore.Kuri",
        components: [
          {
            name: "creator",
            type: "address",
            internalType: "address",
          },
          {
            name: "kuriAmount",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "totalParticipantsCount",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "totalActiveParticipantsCount",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "intervalDuration",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "nexRaffleTime",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "nextIntervalDepositTime",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "launchPeriod",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "startTime",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "endTime",
            type: "uint48",
            internalType: "uint48",
          },
          {
            name: "intervalType",
            type: "uint8",
            internalType: "enum KuriCore.IntervalType",
          },
          {
            name: "state",
            type: "uint8",
            internalType: "enum KuriCore.KuriState",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "KuriSlotClaimed",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "timestamp",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "kuriAmount",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "intervalIndex",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketVRFSubscriptionDone",
    inputs: [
      {
        name: "subscriptionId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "subscriber",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MembershipRequested",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferRequested",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RaffleWinnerSelected",
    inputs: [
      {
        name: "intervalIndex",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
      {
        name: "winnerIndex",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
      {
        name: "winnerAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "winnerTimestamp",
        type: "uint48",
        indexed: false,
        internalType: "uint48",
      },
      {
        name: "requestId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleAdminChanged",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleGranted",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UserAccepted",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "caller",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "_totalActiveParticipantsCount",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UserDeposited",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "userIndex",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "intervalIndex",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amountDeposited",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "depositTimestamp",
        type: "uint48",
        indexed: false,
        internalType: "uint48",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UserFlagged",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "intervalIndex",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UserRejected",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "caller",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AccessControlBadConfirmation",
    inputs: [],
  },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "neededRole",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "KuriCore__AlreadyPastLaunchPeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__AlreadyRejected",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__BeefyArraysOutOfBound",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__CallerNotAccepted",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__CantAcceptMoreThanMax",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__CantFlagForInvalidIndex",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__CantFlagUserAlreadyPaid",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__CantOperateWhenNotInLaunch",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__CantWithdrawWhenCycleIsActive",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__DepositIntervalNotReached",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InsufficientClaimBalance",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidBeefyDepositAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidIntervalIndex",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidPosition",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidRecipient",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidSource",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidSubscriptionId",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidUser",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidUserRequest",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidVaultAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__InvalidWithdrawToken",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__KuriFilledAlready",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__MatketYetToBeSubscribed",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__NoActiveIndicesLeft",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__NoActiveKuri",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__NotInLaunchState",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__OnlyCircleCurrencyAllowed",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__RaffleDelayNotOver",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserAlreadyAccepted",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserAlreadyDeposited",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserAlreadyFlagged",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserAlreadyRequested",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserHasClaimedAlready",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserYetToGetASlot",
    inputs: [],
  },
  {
    type: "error",
    name: "KuriCore__UserYetToMakePayments",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyCoordinatorCanFulfill",
    inputs: [
      {
        name: "have",
        type: "address",
        internalType: "address",
      },
      {
        name: "want",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OnlyOwnerOrCoordinator",
    inputs: [
      {
        name: "have",
        type: "address",
        internalType: "address",
      },
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "coordinator",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
] as const;
