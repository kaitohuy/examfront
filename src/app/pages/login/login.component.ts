import { Component, OnInit } from '@angular/core';
import { sharedImports } from '../../shared/shared-imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginService } from '../../services/login.service';
import { Router } from '@angular/router';
import { ReviewReminderService } from '../../services/review-reminder.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ...sharedImports,

  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  constructor(private snack: MatSnackBar, private login: LoginService, private router: Router, private remind: ReviewReminderService) { }

  public loginData = {
    username: '',
    password: '',
  };

  ngOnInit(): void {
  }

  formSubmit() {
    console.log("User data submitted:", this.loginData);
    if (this.loginData.username.trim() === '' || this.loginData.username.trim() === null ||
      this.loginData.password.trim() === '' || this.loginData.password.trim() === null) {
      this.snack.open("Username and password are required", "OK", {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right',
      });
      return;
    }

    //request to server to generate token
    this.login.generateToken(this.loginData).subscribe({
      next: (data: any) => {
        console.log("Token generated:", data);

        //login user
        this.login.loginUser(data.token);
        this.login.getCurrentUser().subscribe({
          next: (user: any) => {
            console.log("User logged in:", user);
            this.login.setUser(user);
            //redirect to dashboard
            console.log(this.login.getUserRole());
            if (this.login.getUserRole() === 'ADMIN') {
              this.router.navigate(['/admin']);
              this.login.loginStatusSubject.next(true);

            }
            else if (this.login.getUserRole() === 'HEAD') {
              this.router.navigate(['/head-dashboard']);
              this.login.loginStatusSubject.next(true);
              this.remind.checkOnEnterDashboard();
            } else if (this.login.getUserRole() === 'TEACHER') {
              this.router.navigate(['/user-dashboard']);
              this.login.loginStatusSubject.next(true);
              this.remind.checkOnEnterDashboard();
            }
            else {
              this.snack.open("Invalid user role", "OK", {
                duration: 3000,
                verticalPosition: 'top',
                horizontalPosition: 'right',
              });
            }
          },
          error: (error) => {
            console.error("Error fetching current user:", error);
            this.snack.open("Login failed, please try again", "OK", {
              duration: 3000,
              verticalPosition: 'top',
              horizontalPosition: 'right',
            });
          }
        });
      },
      //error
      error: (error) => {
        console.error("Error generating token:", error);
        this.snack.open("Invalid credentials, please try again", "OK", {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
        });
      }
    });
  }

  forgotPassword() {
    alert("Redirecting to forgot password page...");
  }

}
