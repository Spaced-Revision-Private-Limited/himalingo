pipeline {
  agent any

  stages {
    stage('Clone') {
      steps {
        echo 'Code pulled from GitHub'
      }
    }

    stage('Build') {
      steps {
        sh 'echo Build started'
      }
    }

    stage('Run') {
      steps {
        sh 'echo Running project'
      }
    }
  }
}
