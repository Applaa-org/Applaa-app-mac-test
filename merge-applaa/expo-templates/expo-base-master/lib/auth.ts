let signedIn = true; // base template defaults to signed in for simplicity

export function isSignedIn(): boolean {
  return signedIn;
}

export function setSignedIn(value: boolean): void {
  signedIn = value;
}


