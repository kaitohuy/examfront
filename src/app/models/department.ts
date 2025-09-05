export interface Department {
  id: number;
  name: string;
  description: string;
  headUser: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}