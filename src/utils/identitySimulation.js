/**
 * Identity Resolution Simulation
 * 
 * Integrated from trashFiles/identity-simulation for use in Visualizer2
 * This module implements a simplified version of Twilio Segment's identity
 * resolution algorithm following the flat matching logic.
 */

export class Profile {
  constructor(id) {
    this.id = id != null ? id : Profile._nextId();
    this.identifiers = {};
    this.history = [];
  }

  static _nextId() {
    if (!this._counter) this._counter = 1;
    const id = this._counter;
    this._counter += 1;
    return `profile_${id}`;
  }

  addIdentifier(type, value) {
    if (!this.identifiers[type]) {
      this.identifiers[type] = new Set();
    }
    this.identifiers[type].add(value);
  }

  addIdentifiers(type, values) {
    for (const v of values) {
      this.addIdentifier(type, v);
    }
  }

  log(message) {
    this.history.push(message);
  }
}

export class IdentitySimulation {
  constructor(config = {}) {
    this.profiles = [];
    
    // Default limits following Segment's suggestions
    const defaultLimits = {
      user_id: 1,
      email: 5,
      anonymous_id: 5,
    };
    
    this.limits = { ...defaultLimits, ...(config.limits || {}) };
    
    // Default priorities: user_id highest (1), email next (2), others by alphabetical order starting at 3
    const defaultPriorities = {
      user_id: 1,
      email: 2,
      anonymous_id: 3,
      ga_client_id: 4,
    };
    
    this.priorities = { ...defaultPriorities, ...(config.priorities || {}) };
    this._profileCounter = 0;
  }

  normalizeIdentifiers(identifiers) {
    const result = {};
    for (const type in identifiers || {}) {
      const raw = identifiers[type];
      const set = new Set();
      if (raw == null) {
        continue;
      }
      if (Array.isArray(raw) || raw instanceof Set) {
        for (const v of raw) {
          if (v != null) set.add(String(v));
        }
      } else {
        set.add(String(raw));
      }
      if (set.size > 0) {
        result[type] = set;
      }
    }
    return result;
  }

  createProfile(identifiers) {
    const profile = new Profile(`profile_${++this._profileCounter}`);
    for (const type of Object.keys(identifiers)) {
      profile.addIdentifiers(type, identifiers[type]);
    }
    profile.log('Created profile');
    this.profiles.push(profile);
    return profile;
  }

  getMatchingProfiles(identifiers) {
    const matches = new Set();
    for (let i = 0; i < this.profiles.length; i++) {
      const profile = this.profiles[i];
      for (const type in identifiers) {
        const values = identifiers[type];
        const existing = profile.identifiers[type];
        if (!existing) continue;
        for (const v of values) {
          if (existing.has(v)) {
            matches.add(i);
            break;
          }
        }
        if (matches.has(i)) break;
      }
    }
    return matches;
  }

  getProfilesForIdentifiers(identifiers) {
    const result = {};
    for (const type in identifiers) {
      const values = identifiers[type];
      const set = new Set();
      for (let i = 0; i < this.profiles.length; i++) {
        const profile = this.profiles[i];
        const existing = profile.identifiers[type];
        if (!existing) continue;
        for (const v of values) {
          if (existing.has(v)) {
            set.add(i);
            break;
          }
        }
      }
      result[type] = set;
    }
    return result;
  }

  canAddToProfile(profile, identifiers) {
    for (const type in identifiers) {
      const values = identifiers[type];
      const limit = this.limits[type] != null ? this.limits[type] : 5;
      const existing = profile.identifiers[type] ? profile.identifiers[type].size : 0;
      let newCount = 0;
      for (const v of values) {
        if (!profile.identifiers[type] || !profile.identifiers[type].has(v)) {
          newCount++;
        }
      }
      if (existing + newCount > limit) {
        return false;
      }
    }
    return true;
  }

  hasAddableProfile(matchedProfiles, identifiers) {
    for (const index of matchedProfiles) {
      const profile = this.profiles[index];
      if (this.canAddToProfile(profile, identifiers)) {
        return true;
      }
    }
    return false;
  }

  checkMergeConflict(profileIndices, identifiers) {
    const combined = new Map();
    for (const idx of profileIndices) {
      const profile = this.profiles[idx];
      for (const type in profile.identifiers) {
        if (!combined.has(type)) combined.set(type, new Set());
        const set = combined.get(type);
        for (const v of profile.identifiers[type]) {
          set.add(v);
        }
      }
    }
    for (const type in identifiers) {
      if (!combined.has(type)) combined.set(type, new Set());
      const set = combined.get(type);
      for (const v of identifiers[type]) {
        set.add(v);
      }
    }
    for (const [type, set] of combined.entries()) {
      const limit = this.limits[type] != null ? this.limits[type] : 5;
      if (set.size > limit) {
        return true;
      }
    }
    return false;
  }

  mergeProfiles(profileIndices) {
    if (profileIndices.length === 0) {
      throw new Error('No profiles provided for merge');
    }
    const sorted = [...profileIndices].sort((a, b) => b - a);
    const baseIndex = sorted.pop();
    const baseProfile = this.profiles[baseIndex];
    baseProfile.log(`Starting merge of profiles: ${profileIndices.join(', ')}`);
    
    for (const idx of sorted) {
      const profile = this.profiles[idx];
      for (const type in profile.identifiers) {
        if (!baseProfile.identifiers[type]) {
          baseProfile.identifiers[type] = new Set();
        }
        for (const v of profile.identifiers[type]) {
          baseProfile.identifiers[type].add(v);
        }
      }
      baseProfile.history.push(...profile.history);
      baseProfile.log(`Merged profile ${profile.id}`);
      this.profiles.splice(idx, 1);
    }
    return baseProfile;
  }

  addIdentifiersToProfile(profileIndex, identifiers) {
    const profile = this.profiles[profileIndex];
    for (const type in identifiers) {
      const set = identifiers[type];
      if (!profile.identifiers[type]) {
        profile.identifiers[type] = new Set();
      }
      for (const v of set) {
        if (!profile.identifiers[type].has(v)) {
          profile.identifiers[type].add(v);
        }
      }
    }
    profile.log('Added identifiers from event');
  }

  findLowestPriority(identifiers) {
    let lowestType = null;
    let highestRank = -Infinity;
    
    const assignedRanks = { ...this.priorities };
    const existingRanks = Object.values(assignedRanks);
    const baseRank = existingRanks.length > 0 ? Math.max(...existingRanks) + 1 : 1;
    const sortedTypes = Object.keys(identifiers).sort();
    
    let nextRank = baseRank;
    for (const type of sortedTypes) {
      if (assignedRanks[type] == null) {
        assignedRanks[type] = nextRank++;
      }
    }
    for (const type of Object.keys(identifiers)) {
      const rank = assignedRanks[type];
      if (rank > highestRank) {
        highestRank = rank;
        lowestType = type;
      }
    }
    return lowestType;
  }

  static parseDroppedIdentifiers(logs) {
    const dropped = [];
    for (const msg of logs) {
      const match = msg.match(/Dropped identifier type '([^']+)'/);
      if (match) {
        dropped.push(match[1]);
      }
    }
    return dropped;
  }

  processEvent(event) {
    const logs = [];
    let identifiers = this.normalizeIdentifiers(event.identifiers || {});
    
    if (Object.keys(identifiers).length === 0) {
      logs.push('No identifiers provided; created new profile');
      const profile = this.createProfile({});
      return { action: 'create', profile, dropped: [], logs };
    }

    while (true) {
      // Q1: Does this event payload contain an identifier that already exists on another profile?
      const matched = this.getMatchingProfiles(identifiers);
      if (matched.size === 0) {
        logs.push('No matching profiles found. Creating new profile.');
        const profile = this.createProfile(identifiers);
        return {
          action: 'create',
          profile,
          dropped: IdentitySimulation.parseDroppedIdentifiers(logs),
          logs,
        };
      }

      // Q2: Would adding any of the payload's identifiers to existing profile conflict with identity resolution limits?
      const canAdd = this.hasAddableProfile(matched, identifiers);
      if (!canAdd) {
        const toDrop = this.findLowestPriority(identifiers);
        if (toDrop == null) {
          logs.push('All identifiers dropped due to conflict. Creating new profile.');
          const profile = this.createProfile({});
          return {
            action: 'create',
            profile,
            dropped: IdentitySimulation.parseDroppedIdentifiers(logs),
            logs,
          };
        }
        delete identifiers[toDrop];
        logs.push(`Dropped identifier type '${toDrop}' due to limit conflict`);
        continue;
      }

      // Q3: Are there other identifiers in the payload that belong to more than one profile?
      const perTypeProfiles = this.getProfilesForIdentifiers(identifiers);
      
      let intersection = null;
      for (const type in perTypeProfiles) {
        const set = perTypeProfiles[type];
        const unionForType = new Set(set);
        if (intersection === null) {
          intersection = new Set(unionForType);
        } else {
          intersection = new Set([...intersection].filter((idx) => unionForType.has(idx)));
        }
      }
      const candidates = [];
      if (intersection && intersection.size > 0) {
        for (const idx of intersection) {
          const profile = this.profiles[idx];
          let hasAll = true;
          for (const type in identifiers) {
            const values = identifiers[type];
            for (const v of values) {
              if (!profile.identifiers[type] || !profile.identifiers[type].has(v)) {
                hasAll = false;
                break;
              }
            }
            if (!hasAll) break;
          }
          if (hasAll) candidates.push(idx);
        }
      }
      if (candidates.length === 1) {
        const idx = candidates[0];
        this.addIdentifiersToProfile(idx, identifiers);
        logs.push(`Added identifiers to existing profile ${this.profiles[idx].id}.`);
        return {
          action: 'add',
          profile: this.profiles[idx],
          dropped: IdentitySimulation.parseDroppedIdentifiers(logs),
          logs,
        };
      }

      const unionProfiles = new Set();
      for (const type in perTypeProfiles) {
        for (const idx of perTypeProfiles[type]) {
          unionProfiles.add(idx);
        }
      }
      if (unionProfiles.size <= 1) {
        logs.push('No single profile matches all identifiers. Creating new profile.');
        const profile = this.createProfile(identifiers);
        return {
          action: 'create',
          profile,
          dropped: IdentitySimulation.parseDroppedIdentifiers(logs),
          logs,
        };
      }

      const toMerge = [...unionProfiles];
      const conflict = this.checkMergeConflict(toMerge, identifiers);
      if (!conflict) {
        const merged = this.mergeProfiles(toMerge);
        const mergedIndex = this.profiles.indexOf(merged);
        this.addIdentifiersToProfile(mergedIndex, identifiers);
        logs.push(`Merged profiles and added identifiers into profile ${merged.id}.`);
        return {
          action: 'merge',
          profile: merged,
          dropped: IdentitySimulation.parseDroppedIdentifiers(logs),
          logs,
        };
      } else {
        const toDrop = this.findLowestPriority(identifiers);
        if (toDrop == null) {
          logs.push('All identifiers exhausted during merge conflict. Creating new profile.');
          const profile = this.createProfile({});
          return {
            action: 'create',
            profile,
            dropped: IdentitySimulation.parseDroppedIdentifiers(logs),
            logs,
          };
        }
        delete identifiers[toDrop];
        logs.push(`Dropped identifier type '${toDrop}' due to merge conflict`);
        continue;
      }
    }
  }
}
