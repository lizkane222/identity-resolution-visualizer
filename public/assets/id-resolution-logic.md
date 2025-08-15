# ID Resolution Logic Flow

This diagram represents the identity resolution decision logic for processing event payloads against existing profiles.

```mermaid
flowchart TD
    A[Event Payload with Identifiers] --> B{Does this event payload contain an identifier that already exists on another profile?}
    
    B -->|No| C[Action: Create a New Profile]
    
    B -->|Yes, 1 or more| D{Would adding any of the payload's identifiers to existing profile(s) conflict with identity resolution limits?}
    
    D -->|No| H[Action: Add to Existing Profile]
    D -->|Yes| E[Drop identifier with lowest priority from payload]
    
    E --> F{After dropping lowest priority, would adding any of the remaining identifiers in the payload still conflict with identity resolution limits for the existing profile?}
    
    F -->|Yes| E
    F -->|No| G{Are there other identifiers in the payload that belong to more than one profile?}
    
    D -->|No| G
    
    G -->|No| H[Action : Create a New Profile]
    <!-- [Action: Add to Existing Profile] -->
    
    G -->|Yes| I{Would the merge cause identifiers on existing profiles to conflict or exceed identity resolution limits?}
    
    I -->|Yes| E2[Drop identifier with lowest priority from payload]
    E2 --> E
    I -->|No| L[Action: Merge Existing Profiles]
    
    %% Styling
    classDef actionClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decisionClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dropClass fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class C,H,L actionClass
    class B,D,F,G,I,K decisionClass
    class E,J dropClass
```

## Key Components:

### Entry Point
- **Event Payload**: Contains identifiers that need to be processed

### Decision Points
1. **Existing Profile Check**: Does the payload contain any identifier that already exists on a profile?
2. **Conflict Detection**: Would adding identifiers cause conflicts with resolution limits?
3. **Multi-Profile Check**: Do identifiers belong to multiple existing profiles?
4. **Merge Conflict Check**: Would merging profiles cause conflicts?

### Actions
- **Create New Profile**: When no existing profile matches
- **Add to Existing Profile**: When identifiers can be safely added to one profile
- **Merge Existing Profiles**: When multiple profiles need to be combined

### Priority-Based Resolution
- **Drop Lowest Priority**: Recursive process to remove conflicting identifiers based on priority and limit
- **Conflict Resolution Loop**: Continues until no conflicts remain

## Logic Flow Summary:

1. Check if payload identifiers match existing profiles
2. If conflicts arise, drop lowest priority identifiers iteratively
3. Determine if multiple profiles are involved
4. Handle merge conflicts by dropping lowest priority identifiers
5. Execute final action (Create, Add, or Merge)

## Notes:
- Priority-based dropping ensures deterministic conflict resolution
- Recursive loops handle complex multi-identifier conflicts
- Final actions maintain profile integrity within resolution limits
